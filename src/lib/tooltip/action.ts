// TODO: Make it so you can add custom elements

import { deepMerge, em2px, generateID } from '$lib/utils';
import type { Config, RequiredConfig } from './types';
import type { Action } from 'svelte/action';
import {
  // main
  autoUpdate, computePosition,

  // middleware
  arrow as fuiArrow,
  flip as fuiFlip,
  offset as fuiOffset,
  shift as fuiShift,
} from '@floating-ui/dom';

export const tooltip: Action<HTMLElement, Config> = (node: HTMLElement, opts: Config = {}) => {
  const defaults: RequiredConfig = {
    allowHtml: false,
    arrow: true,
    class: 'tooltip',
    content: node.title,
    target: 'body',
    visible: 'auto',
    computePositionCallback: (data, { wrapper, arrow }) => {
      const { x, y, placement, middlewareData } = data;
      wrapper.style.left = x + 'px';
      wrapper.style.top = y + 'px';

      const placementParts = placement.split('-') as [
        'top' | 'bottom' | 'left' | 'right',
        'start' | 'end' | null
      ];
      const opposites = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      };
      const opposite = opposites[placementParts[0]];

      let originCross = 'center';
      if (placement === 'top' || placement === 'bottom') {
        if (placementParts[1] === 'start') originCross = 'top';
        else if (placementParts[1] === 'end') originCross = 'bottom';
      } else {
        if (placementParts[1] === 'start') originCross = 'left';
        else if (placementParts[1] === 'end') originCross = 'right';
      }

      Object.assign(wrapper.style, {
        'transform-origin': opposite + ' ' + originCross,
      });

      if (middlewareData.arrow) {
        const { x, y } = middlewareData.arrow;

        arrow?.setAttribute('data-direction', opposite);
        Object.assign(arrow!.style, {
          left: x + 'px',
          top: y + 'px',
          [opposite]: 'calc(var(--_size) / -2)',
        });
      }
    },
    fuiConfig: {
      placement: 'top',
      middleware: [
        fuiFlip(),
        fuiOffset(em2px(0.5)),
        fuiShift(),
      ],
    },
    fuiAutoUpdateConfig: {}
  };

  opts = deepMerge(defaults, opts);
  if (!opts.content) throw new Error('No content defined, either add the content option or add a title property to the element.');

  const keydownHandler = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape': {
        hide();
      } break;
    }
  };

  let inDom: boolean;
  const id = node.id ? node.id + '-tooltip' : generateID();
  let tooltip = createTooltip(node, opts, id);

  async function hide() {
    if (inDom) {
      await animate('out');
      tooltip.wrapper.remove();
      node.removeAttribute('aria-describedby');
      inDom = false;
    }
  }
  async function show() {
    if (!inDom) {
      getElement(opts.target)!.appendChild(tooltip.wrapper);
      inDom = true;
      node.setAttribute('aria-describedby', id);
      await animate('in');
    }
  }

  switch (opts.visible) {
    case true: {
      show();
    } break;

    case 'auto': {
      node.addEventListener('mouseenter', show);
      node.addEventListener('mouseleave', hide);
      node.addEventListener('focus', show);
      node.addEventListener('blur', hide);
      window.addEventListener('keydown', keydownHandler);
    } break;
  }

  function animate(type: string) {
    return new Promise<void>((resolve, reject) => {
      tooltip.wrapper.setAttribute('data-animating', type);

      const style = getComputedStyle(tooltip.wrapper);
      const animation = parseFloat(style.getPropertyValue('animation-duration'));
      const transition = parseFloat(style.getPropertyValue('transition-duration'));
      if (animation <= 0 && transition <= 0) {
        tooltip.wrapper.removeAttribute('data-animating');
        console.error('No animation found.');
        reject();
      }

      tooltip.wrapper.addEventListener('animationend', () => {
        tooltip.wrapper.removeAttribute('data-animating');
        resolve();
      });
    });
  }

  function handleUpdate(key: keyof Config, newOpts: Config) {
    switch (key) {
      case 'content': {
        tooltip.content[newOpts.allowHtml ? 'innerHTML' : 'textContent'] = newOpts.content;
        node.setAttribute('data-tooltip-content', newOpts.content);
      } break;
      case 'allowHtml': {
        tooltip.content[newOpts.allowHtml ? 'innerHTML' : 'textContent'] = newOpts.content;
        tooltip.content.setAttribute('data-allow-html', newOpts.allowHtml ? 'true' : 'false');
        node.setAttribute('data-tooltip-content', newOpts.content);
      } break;
      case 'class': {
        const modifiedOldClasses = getClasses(opts.class!);
        const modifiedNewClasses = getClasses(newOpts.class!);

        tooltip.wrapper.classList.remove(...modifiedOldClasses.wrapper);
        tooltip.wrapper.classList.add(...modifiedNewClasses.wrapper);
        tooltip.content.classList.remove(...modifiedOldClasses.content);
        tooltip.content.classList.add(...modifiedNewClasses.content);
        tooltip.arrow?.classList.remove(...modifiedOldClasses.arrow);
        tooltip.arrow?.classList.add(...modifiedNewClasses.arrow);
      } break;
      case 'visible': {
        if (!newOpts.visible) hide(); // this is put here because there's a breakthrough in the switch
        switch (newOpts.visible) {
          case true: show(); // break omitted
          case false: {
            node.removeEventListener('mouseenter', show);
            node.removeEventListener('mouseleave', hide);
            node.removeEventListener('focus', show);
            node.removeEventListener('blur', hide);
          } break;
          case 'auto': {
            node.addEventListener('mouseenter', show);
            node.addEventListener('mouseleave', hide);
            node.addEventListener('focus', show);
            node.addEventListener('blur', hide);
          } break;
        }
      } break;
      default: {
        tooltip = createTooltip(node, opts, id);
      } break;
    }
  }

  return {
    update(newOpts: Config) {
      for (const k in newOpts) {
        const key = k as keyof Config;
        handleUpdate(key, newOpts);
      }
      opts = deepMerge(defaults, newOpts);
    },
    destroy() {
      window.removeEventListener('keydown', keydownHandler);
      for (const k in tooltip) {
        const key = k as keyof typeof tooltip;
        tooltip[key]?.remove();
      }
    },
  };
};

export default tooltip;

function createTooltip(node: HTMLElement, opts: Config, id: string) {
  const classes = getClasses(opts.class ?? []);

  const wrapper = document.createElement('div');
  wrapper.classList.add(...classes.wrapper);
  wrapper.role = 'tooltip';
  wrapper.id = id;

  const content = document.createElement('div');
  content.classList.add(...classes.content);
  content.setAttribute('data-allow-html', opts.allowHtml ? 'true' : 'false');
  content[opts.allowHtml ? 'innerHTML' : 'textContent'] = opts.content;
  wrapper.appendChild(content);

  let arrow: HTMLDivElement | undefined;
  if (opts.arrow) {
    arrow = document.createElement('div');
    arrow.classList.add(...classes.arrow);
    wrapper.appendChild(arrow);

    opts.fuiConfig!.middleware ??= [];
    opts.fuiConfig!.middleware.push(fuiArrow({ element: arrow }));
  }

  autoUpdate(node, wrapper, () => {
    computePosition(node, wrapper, opts.fuiConfig).then((computePositionReturn) => {
      opts.computePositionCallback!(computePositionReturn, { wrapper, content, arrow });
    });
  });

  return {
    wrapper,
    content,
    arrow,
  };
}

function getElement(elem: Config['target']) {
  return typeof elem === 'string'
    ? document.querySelector(elem)
    : elem;
}

function getClasses(classes: RequiredConfig['class']) {
  if (typeof classes === 'string') classes = classes.split(' ');
  if (typeof classes[0] === 'string' && !classes[0]) classes[0] = 'tooltip';
  if (classes.length === 0) classes.push('tooltip');

  return {
    wrapper: classes.map(c => c + (c ? '-' : '') + 'wrapper'),
    content: classes.map(c => c + (c ? '-' : '') + 'content'),
    arrow: classes.map(c => c + (c ? '-' : '') + 'arrow'),
  };
}
