import { ComputePositionConfig } from '@floating-ui/dom';

export type RequiredConfig = {
  allowHtml: boolean;
  arrow: boolean;
  class: string | string[];
  content: any;
  target: HTMLElement | string;
  visible: boolean | 'auto';
  placement: ComputePositionConfig['placement'];
  middleware: ComputePositionConfig['middleware'];
};

export type Config = Partial<RequiredConfig>;
