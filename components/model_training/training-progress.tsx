"use client";

import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Clock, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchModelResults } from "@/lib/api";

interface StepDetails {
  [key: string]: any;
}

interface TrainingStep {
  id: number;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  details: StepDetails;
}

interface TrainingProgressProps {
  startTraining: () => Promise<void>;
  isTraining: boolean;
  onTrainingComplete: () => Promise<void>;
  datasetId: number | null;
  datasetName: string | null;
}

export function TrainingProgress({
  startTraining,
  isTraining,
  onTrainingComplete,
  datasetId,
  datasetName,
}: TrainingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState("Preparing data...");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [steps, setSteps] = useState<{ [key: number]: TrainingStep }>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const [localDatasetId, setLocalDatasetId] = useState<number | null>(null);
  const [localDatasetName, setLocalDatasetName] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/").replace(/\/?$/, "/");

  const Spinner = ({ className = "" }) => (
    <div
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${className}`}
    ></div>
  );

  // Load dataset info safely on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("selectedDataset");
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setLocalDatasetId(data.id ?? null);
          setLocalDatasetName(data.name ?? null);
          console.log("Dataset ID:", data.id);
        } catch (error) {
          console.error("Error parsing dataset from localStorage:", error);
        }
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      console.log("Fetching model results...");
      const data = await fetchModelResults();
      if (data.length !== 0) {
        setTrainingComplete(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const models = [
    "Preparing data...",
    "Ridge",
    "Lasso",
    "ElasticNet",
    "RandomForest",
    "GradientBoosting",
    "LogisticRegression",
    "XGBoost",
    "LightGBM",
    "CatBoost",
    "SVM",
    "SVR",
    "KNN",
    "DecisionTree",
    "NaiveBayes",
    "MLP",
    "ExtraTrees",
    "AdaBoost",
    "SGDRegressor",
    "Finalizing results...",
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      addLog(`Initiating download for model: ${localDatasetId}`);

      if (!localDatasetId) {
        throw new Error("Model ID is required for download");
      }

      const downloadUrl = `${API}api/download-model/${localDatasetId}/`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `model-${localDatasetId}.pkl`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addLog(`Download started for model: ${localDatasetId}`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error downloading model:", error);
      addLog(`Error downloading model: ${errorMessage}`);
      return false;
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!isTraining) return;

    console.log("Setting up SSE stream");
    let eventSource: EventSource | null = null;
    let retryCount = 0;
    const maxRetries = 10;
    const baseRetryDelay = 1000;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`${API}api/stream/`);

      eventSource.onopen = () => {
        setConnected(true);
        retryCount = 0;
        addLog("Connected to SSE stream");
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
        setConnected(false);

        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(30000, baseRetryDelay * Math.pow(2, retryCount));
          addLog(`SSE connection error. Retrying in ${delay / 1000}s (${retryCount}/${maxRetries})`);
          setTimeout(connectSSE, delay);
        } else {
          addLog("Maximum retry attempts reached. Please refresh the page.");
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TrainingStep;
          setSteps((prev) => ({
            ...prev,
            [data.id]: data,
          }));

          const statusEmoji =
            data.status === "completed"
              ? "✅"
              : data.status === "processing"
              ? "⏳"
              : data.status === "error"
              ? "❌"
              : "⏺️";
          addLog(`${statusEmoji} ${data.name}: ${data.status}`);
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isTraining]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Training Progress</CardTitle>
          <CardDescription>
            {localDatasetName ? `Dataset: ${localDatasetName}` : "Loading dataset..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} />
          <div>Current Model: {currentModel}</div>
          <div>Time Remaining: {timeRemaining} seconds</div>
          <div>
            Connection Status:{" "}
            {connected ? (
              <span className="text-green-500">Connected</span>
            ) : (
              <span className="text-red-500">Disconnected</span>
            )}
          </div>
          {trainingComplete && (
            <Button onClick={downloadModel} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Download Model
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>Real-time updates of training steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="h-64 overflow-y-auto bg-gray-100 p-4 rounded"
          >
            {log.map((entry, idx) => (
              <div key={idx}>{entry}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
