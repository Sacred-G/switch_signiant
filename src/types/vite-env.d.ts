/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIGNIANT_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.jsx' {
  import React from 'react'
  const Component: React.ComponentType<any>
  export default Component
}

declare module '../components/ui/*' {
  import React from 'react'
  const Component: React.ComponentType<any>
  export default Component
  export * from '../components/ui/*'
}

declare module '../components/transferProgress' {
  import React from 'react'
  interface TransferProgressProps {
    transferProgress: {
      percentComplete: number;
      filesRemaining: number;
      bytesTransferred: number;
    };
    transferStartedOn: string;
    currentRateBitsPerSecond: number;
  }
  const TransferProgress: React.FC<TransferProgressProps>
  export { TransferProgress }
}
