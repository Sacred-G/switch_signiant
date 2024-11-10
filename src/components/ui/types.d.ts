import React from 'react';

declare module '../components/ui/card' {
  export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

declare module '../components/ui/badge' {
  export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  }
  export const Badge: React.FC<BadgeProps>;
}

declare module '../components/ui/button' {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }
  export const Button: React.FC<ButtonProps>;
}

declare module '../components/ui/input' {
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.FC<InputProps>;
}

declare module '../components/ui/table' {
  export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>>;
  export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>;
  export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>>;
  export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>>;
  export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>>;
}

declare module '../components/ui/use-toast' {
  export interface ToastProps {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }
  export function useToast(): {
    toast: (props: ToastProps) => void;
  };
}
