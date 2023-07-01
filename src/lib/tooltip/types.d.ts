import { AutoUpdateOptions, ComputePositionConfig, ComputePositionReturn } from '@floating-ui/dom';

interface elements {
  content: HTMLElement;
  wrapper: HTMLElement;
  arrow?: HTMLDivElement;
}

export interface RequiredConfig {
  allowHtml: boolean;
  arrow: boolean;
  class: string | string[];
  content: any;
  target: HTMLElement | string;
  visible: boolean | 'auto';

  // floating-ui stuff
  computePositionCallback: (ComputePositionReturn: ComputePositionReturn, elements: elements) => void;
  fuiConfig: ComputePositionConfig,
  fuiAutoUpdateConfig: AutoUpdateOptions,
}

export type Config = Partial<RequiredConfig>;
