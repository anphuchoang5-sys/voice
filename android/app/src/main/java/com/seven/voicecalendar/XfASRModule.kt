package com.seven.voicecalendar

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.iflytek.sparkchain.core.SparkChain
import com.iflytek.sparkchain.core.SparkChainConfig
import com.iflytek.sparkchain.core.asr.ASR
import com.iflytek.sparkchain.core.asr.AsrCallbacks
import java.io.File
import kotlin.concurrent.thread

class XfASRModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private companion object {
    const val MODULE_NAME = "XfASR"
    const val TAG = "XfASRModule"
    // 凭证从 BuildConfig 读取，源头在 android/local.properties（不提交 git）
    val APP_ID: String get() = BuildConfig.XF_APP_ID
    val API_KEY: String get() = BuildConfig.XF_API_KEY
    val API_SECRET: String get() = BuildConfig.XF_API_SECRET
    const val SAMPLE_RATE = 16000
    const val PCM_CHUNK_SIZE = 1280
  }

  private val lock = Any()

  @Volatile
  private var sparkInitialized = false

  @Volatile
  private var isRecording = false

  @Volatile
  private var audioRecord: AudioRecord? = null

  @Volatile
  private var recordThread: Thread? = null

  @Volatile
  private var mAsr: ASR? = null

  private val asrCallbacks = object : AsrCallbacks {
    override fun onResult(result: ASR.ASRResult?, tag: Any?) {
      val text = result?.bestMatchText.orEmpty()
      when (result?.status) {
        1 -> emitTextEvent("onXfASRPartialResult", text)
        2 -> {
          emitTextEvent("onXfASRFinalResult", text)
          stopAudioCapture()
          clearAsr()
        }
      }
    }

    override fun onError(error: ASR.ASRError?, tag: Any?) {
      Log.e(TAG, "ASR error: code=${error?.code ?: -1}, message=${error?.errMsg}, tag=$tag")
      val params = Arguments.createMap().apply {
        putInt("code", error?.code ?: -1)
        putString("message", error?.errMsg ?: "讯飞语音识别失败")
      }
      emitEvent("onXfASRError", params)
      stopInternal(shouldStopAsr = false)
    }
  }

  override fun getName(): String = MODULE_NAME

  override fun initialize() {
    super.initialize()
    initializeSparkChain()
  }

  @ReactMethod
  fun startListening(promise: Promise) {
    try {
      if (!hasRecordAudioPermission()) {
        promise.reject("NO_RECORD_AUDIO_PERMISSION", "缺少录音权限")
        return
      }

      initializeSparkChain()

      synchronized(lock) {
        if (isRecording) {
          promise.resolve(null)
          return
        }

        val asr = createAsr()
        val ret = asr.start("voicecalendar-${System.currentTimeMillis()}")
        Log.d(TAG, "ASR start ret=$ret")
        if (ret != 0) {
          clearAsr()
          promise.reject("XF_ASR_START_FAILED", "讯飞语音识别启动失败：$ret")
          return
        }

        startAudioRecordLocked()
      }

      promise.resolve(null)
    } catch (error: Exception) {
      stopInternal(shouldStopAsr = true)
      promise.reject("XF_ASR_START_FAILED", error.message ?: "讯飞语音识别启动失败", error)
    }
  }

  @ReactMethod
  fun stopListening(promise: Promise) {
    try {
      stopAudioCapture()
      mAsr?.stop(false)
      promise.resolve(null)
    } catch (error: Exception) {
      stopInternal(shouldStopAsr = false)
      promise.reject("XF_ASR_STOP_FAILED", error.message ?: "讯飞语音识别停止失败", error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  @SuppressLint("MissingPermission")
  private fun startAudioRecordLocked() {
    val minBufferSize = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
    )
    if (minBufferSize <= 0) {
      throw IllegalStateException("AudioRecord buffer 初始化失败：$minBufferSize")
    }

    val record = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBufferSize, PCM_CHUNK_SIZE * 4),
    )
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      throw IllegalStateException("AudioRecord 初始化失败")
    }

    audioRecord = record
    isRecording = true
    record.startRecording()

    recordThread = thread(start = true, name = "XfASR-AudioRecord") {
      val buffer = ByteArray(PCM_CHUNK_SIZE)
      while (isRecording) {
        val readSize = try {
          record.read(buffer, 0, buffer.size)
        } catch (_: Exception) {
          break
        }

        if (readSize > 0) {
          val pcm = if (readSize == buffer.size) buffer.copyOf() else buffer.copyOf(readSize)
          mAsr?.write(pcm)
        } else if (readSize < 0) {
          break
        }
      }
    }
  }

  private fun createAsr(): ASR {
    val asr = ASR()
    asr.language("zh_cn")
    asr.domain("iat")
    asr.accent("mandarin")
    asr.vadEos(2000)
    asr.registerCallbacks(asrCallbacks)
    mAsr = asr
    return asr
  }

  private fun initializeSparkChain() {
    if (sparkInitialized) {
      return
    }

    synchronized(lock) {
      if (sparkInitialized) {
        return
      }

      val workDir = File(reactContext.filesDir, "sparkchain").apply {
        mkdirs()
      }
      val logFile = File(
        reactContext.getExternalFilesDir(null) ?: reactContext.filesDir,
        "SparkChain.log",
      )

      val config = SparkChainConfig.builder()
        .appID(APP_ID)
        .apiKey(API_KEY)
        .apiSecret(API_SECRET)
        .workDir(workDir.absolutePath)
        .logPath(logFile.absolutePath)

      val code = SparkChain.getInst().init(reactContext, config)
      Log.d(TAG, "SparkChain init code=$code, workDir=${workDir.absolutePath}, logPath=${logFile.absolutePath}")
      if (code != 0) {
        throw IllegalStateException("SparkChain 初始化失败：$code")
      }
      sparkInitialized = true
    }
  }

  private fun hasRecordAudioPermission(): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
      reactContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
  }

  private fun emitTextEvent(eventName: String, text: String) {
    val params = Arguments.createMap().apply {
      putString("text", text)
    }
    emitEvent(eventName, params)
  }

  private fun emitEvent(eventName: String, params: Any) {
    if (!reactContext.hasActiveCatalystInstance()) {
      return
    }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun stopInternal(shouldStopAsr: Boolean) {
    stopAudioCapture()
    if (shouldStopAsr) {
      mAsr?.stop(false)
    }
    clearAsr()
  }

  private fun stopAudioCapture() {
    isRecording = false

    val record = audioRecord
    audioRecord = null

    try {
      if (record?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
        record.stop()
      }
    } catch (_: Exception) {
    }

    try {
      record?.release()
    } catch (_: Exception) {
    }

    recordThread = null
  }

  private fun clearAsr() {
    mAsr = null
  }

  override fun onCatalystInstanceDestroy() {
    stopInternal(shouldStopAsr = true)
    if (sparkInitialized) {
      SparkChain.getInst().unInit()
      sparkInitialized = false
    }
    super.onCatalystInstanceDestroy()
  }
}
