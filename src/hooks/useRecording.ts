import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import type { RecordingStatus as ExpoRecordingStatus } from "expo-av/build/Audio/Recording.types";

import {
  RECORDING_STATUS_INTERVAL_MS,
  SILENCE_DETECTION_MIN_DURATION_MS,
  SILENCE_DETECTION_WINDOW_MS,
  SILENCE_THRESHOLD_DB,
} from "../constants/config";

type MicrophonePermissionStatus = "unknown" | "granted" | "denied";

type UseRecordingResult = {
  isRecording: boolean;
  audioUri: string | null;
  durationMillis: number;
  metering: number | null;
  permissionStatus: MicrophonePermissionStatus;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearRecording: () => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "录音失败，请重试";
}

function isSilent(metering: number | null): boolean {
  return metering !== null && metering <= SILENCE_THRESHOLD_DB;
}

export function useRecording(): UseRecordingResult {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const [metering, setMetering] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<MicrophonePermissionStatus>("unknown");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const audioUriRef = useRef<string | null>(null);
  const stopRecordingRef = useRef<() => Promise<string | null>>(
    async (): Promise<string | null> => null,
  );

  const clearRecording = useCallback((): void => {
    setAudioUri(null);
    setDurationMillis(0);
    setMetering(null);
    setErrorMessage(null);
    audioUriRef.current = null;
  }, []);

  const handleRecordingStatusUpdate = useCallback(
    (status: ExpoRecordingStatus): void => {
      const nextMetering =
        typeof status.metering === "number" ? status.metering : null;

      setDurationMillis(status.durationMillis);
      setMetering(nextMetering);

      if (!status.isRecording || isStoppingRef.current) {
        return;
      }

      if (status.durationMillis < SILENCE_DETECTION_MIN_DURATION_MS) {
        silenceStartedAtRef.current = null;
        return;
      }

      if (!isSilent(nextMetering)) {
        silenceStartedAtRef.current = null;
        return;
      }

      const now = Date.now();
      if (silenceStartedAtRef.current === null) {
        silenceStartedAtRef.current = now;
        return;
      }

      if (now - silenceStartedAtRef.current >= SILENCE_DETECTION_WINDOW_MS) {
        void stopRecordingRef.current();
      }
    },
    [],
  );

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;

    if (!recording || isStoppingRef.current) {
      return audioUriRef.current;
    }

    isStoppingRef.current = true;
    silenceStartedAtRef.current = null;

    try {
      recording.setOnRecordingStatusUpdate(null);
      await recording.stopAndUnloadAsync();
      const nextAudioUri = recording.getURI();

      recordingRef.current = null;
      audioUriRef.current = nextAudioUri;
      setAudioUri(nextAudioUri);
      setIsRecording(false);
      setMetering(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return nextAudioUri;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      recordingRef.current = null;
      setIsRecording(false);
      setErrorMessage(message);
      return null;
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  useEffect((): void => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording || isStoppingRef.current) {
      return;
    }

    clearRecording();

    try {
      const permission = await Audio.requestPermissionsAsync();
      const nextPermissionStatus: MicrophonePermissionStatus = permission.granted
        ? "granted"
        : "denied";
      setPermissionStatus(nextPermissionStatus);

      if (!permission.granted) {
        setErrorMessage("需要麦克风权限才能录音");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      recording.setProgressUpdateInterval(RECORDING_STATUS_INTERVAL_MS);
      recording.setOnRecordingStatusUpdate(handleRecordingStatusUpdate);

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setErrorMessage(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      recordingRef.current = null;
      setIsRecording(false);
      setErrorMessage(message);
    }
  }, [clearRecording, handleRecordingStatusUpdate, isRecording]);

  useEffect((): (() => void) => {
    return (): void => {
      const recording = recordingRef.current;
      if (recording) {
        recording.setOnRecordingStatusUpdate(null);
        void recording.stopAndUnloadAsync().catch((): void => undefined);
      }

      void Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch((): void => undefined);
    };
  }, []);

  return {
    isRecording,
    audioUri,
    durationMillis,
    metering,
    permissionStatus,
    errorMessage,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
