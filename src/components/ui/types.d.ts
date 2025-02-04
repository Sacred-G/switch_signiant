declare module '@/components/ui/card' {
  import { FC, HTMLAttributes } from 'react';
  export const Card: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardContent: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: FC<HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/button' {
  import { FC, ButtonHTMLAttributes } from 'react';
  interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }
  export const Button: FC<ButtonProps>;
}

declare module '@/components/ui/input' {
  import { FC, InputHTMLAttributes } from 'react';
  interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}
  export const Input: FC<InputProps>;
}

declare module '@/components/ui/select' {
  import { FC, HTMLAttributes, ReactNode } from 'react';
  interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: ReactNode;
  }
  export const Select: FC<SelectProps>;
  export const SelectContent: FC<HTMLAttributes<HTMLDivElement>>;
  export const SelectItem: FC<HTMLAttributes<HTMLDivElement> & { value: string }>;
  export const SelectTrigger: FC<HTMLAttributes<HTMLButtonElement>>;
  export const SelectValue: FC<{ placeholder?: string }>;
}

declare module '@/components/ui/badge' {
  import { FC, HTMLAttributes } from 'react';
  interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }
  export const Badge: FC<BadgeProps>;
}

declare module '@/components/ui/switch' {
  import { FC, ButtonHTMLAttributes } from 'react';
  interface SwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
  export const Switch: FC<SwitchProps>;
}

declare module '@/components/ui/use-toast' {
  interface ToastProps {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }
  export const useToast: () => {
    toast: (props: ToastProps) => void;
  };
}

declare module '@/components/ui/card.jsx' {
  export * from '@/components/ui/card';
}

declare module '@/components/ui/button.jsx' {
  export * from '@/components/ui/button';
}

declare module '@/components/ui/input.jsx' {
  export * from '@/components/ui/input';
}

declare module '@/components/ui/select.jsx' {
  export * from '@/components/ui/select';
}

declare module '@/components/ui/badge.jsx' {
  export * from '@/components/ui/badge';
}

declare module '@/components/ui/switch.jsx' {
  export * from '@/components/ui/switch';
}

declare module '@/components/ui/use-toast.js' {
  export * from '@/components/ui/use-toast';
}
