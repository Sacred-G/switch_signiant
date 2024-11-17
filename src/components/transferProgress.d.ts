interface TransferProgressProps {
  transferProgress: {
    percentComplete: number;
    filesRemaining: number;
    bytesTransferred: number;
    objectsManifest?: {
      manifestId: string;
      summary: {
        bytes: number;
        count: number;
      };
    };
    transferProgress?: {
      failed: {
        bytes: number;
        count: number;
      };
      skipped: {
        bytes: number;
        count: number;
      };
      transferred: {
        bytes: number;
        count: number;
      };
      remaining: {
        bytes: number;
        count: number;
      };
    };
  };
  transferStartedOn: string;
  currentRateBitsPerSecond: number;
  detailed?: boolean;
}

export const TransferProgress: React.FC<TransferProgressProps>;

export function formatBytes(bytes: number): string;
export function formatTransferRate(bitsPerSecond: number): string;
export function calculateTimeRemaining(startTime: string, percentComplete: number): string;
