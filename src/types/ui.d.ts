declare module '@components/ui/card' {
  export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
  export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
  export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
  export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
  export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

  export const Card: React.FC<CardProps>;
  export const CardHeader: React.FC<CardHeaderProps>;
  export const CardContent: React.FC<CardContentProps>;
  export const CardTitle: React.FC<CardTitleProps>;
  export const CardDescription: React.FC<CardDescriptionProps>;
}

declare module '@components/ui/switch' {
  export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
  export const Switch: React.FC<SwitchProps>;
}

declare module '@components/ui/use-toast' {
  export interface ToastProps {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }

  export interface ToastApi {
    toast: (props: ToastProps) => void;
  }

  export const useToast: () => ToastApi;
}

declare module '@components/ui/button' {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg';
  }
  export const Button: React.FC<ButtonProps>;
}

declare module '@components/ui/input' {
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    prefix?: React.ReactNode;
  }
  export const Input: React.FC<InputProps>;
}
