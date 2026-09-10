import type { FC, ReactNode, SVGProps } from 'react';

export type AppSpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AppSpinnerProps {
  size?: AppSpinnerSize;
  className?: string;
  label?: string;
}

export interface AppLoaderProps {
  label?: ReactNode;
  variant?: 'page' | 'inline' | 'fullscreen' | string;
  size?: AppSpinnerSize;
  className?: string;
  showEllipsis?: boolean;
}

export interface PixnxtMarkIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export const AppSpinner: FC<AppSpinnerProps>;
export const PixnxtMarkIcon: FC<PixnxtMarkIconProps>;
export const AppLoader: FC<AppLoaderProps>;

