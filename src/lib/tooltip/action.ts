import deepMerge from 'deepmerge';
import { em2px, generateID } from '$lib/utils';
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
    placement: 'top',
    middleware: [
      fuiFlip(),
      fuiOffset(em2px(0.5)),
      fuiShift(),
    ],
  };

  let fullOpts = deepMerge(defaults, opts);
  if (!fullOpts.content) throw new Error('No content defined, either add the content option or add a title property to the element.');

  const keydownHandler = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape': {
        hide();
      } break;
    }
  };

  let inDom: boolean;
  const id = node.id ? node.id + '-tooltip' : generateID();
  let tooltip = createTooltip();

  async function hide() {
    if (!inDom) return;

    await animate('out');
    tooltip.wrapper.remove();
    node.removeAttribute('aria-describedby');
    inDom = false;
  }
  async function show() {
    if (inDom) return;

    getElement(fullOpts.target).appendChild(tooltip.wrapper);
    inDom = true;
    node.setAttribute('aria-describedby', id);
    await animate('in');
  }

  switch (fullOpts.visible) {
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

  function handleUpdate(key: keyof Config, newOpts: RequiredConfig) {
    if (newOpts[key] === fullOpts[key]) return;

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
        const modifiedOldClasses = getClasses(fullOpts.class);
        const modifiedNewClasses = getClasses(newOpts.class);

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
        tooltip = createTooltip();
      } break;
    }
  }

  function createTooltip() {
    const classes = getClasses(fullOpts.class ?? []);

    const wrapper = document.createElement('div');
    wrapper.classList.add(...classes.wrapper);
    wrapper.role = 'tooltip';
    wrapper.id = id;

    const content = document.createElement('div');
    content.classList.add(...classes.content);
    content.setAttribute('data-allow-html', fullOpts.allowHtml.toString());
    content[fullOpts.allowHtml ? 'innerHTML' : 'textContent'] = fullOpts.content;
    wrapper.appendChild(content);

    let arrow: HTMLDivElement | undefined;
    if (fullOpts.arrow) {
      arrow = document.createElement('div');
      arrow.classList.add(...classes.arrow);
      wrapper.appendChild(arrow);

      fullOpts.middleware ??= [];
      fullOpts.middleware.push(fuiArrow({ element: arrow }));
    }

    autoUpdate(node, wrapper, () => {
      computePosition(node, wrapper, {
        middleware: fullOpts.middleware,
        placement: fullOpts.placement,
      }).then((data) => {
        const { x, y, placement, middlewareData } = data;
        wrapper.style.left = x + 'px';
        wrapper.style.top = y + 'px';

        const placementParts = placement.split('-') as [
          'top' | 'bottom' | 'left' | 'right',
          'start' | 'end' | null
        ];
        const opposite = {
          top: 'bottom',
          bottom: 'top',
          left: 'right',
          right: 'left',
        }[placementParts[0]];

        let originCross = 'center';
        if (placement === 'top' || placement === 'bottom') {
          if (placementParts[1] === 'start') originCross = 'top';
          else if (placementParts[1] === 'end') originCross = 'bottom';
        } else {
          if (placementParts[1] === 'start') originCross = 'left';
          else if (placementParts[1] === 'end') originCross = 'right';
        }

        wrapper.style.transformOrigin = originCross;

        if (middlewareData.arrow) {
          const { x, y } = middlewareData.arrow;

          arrow!.setAttribute('data-direction', opposite);
          Object.assign(arrow!.style, {
            left: x + 'px',
            top: y + 'px',
            [opposite]: 'calc(var(--_size) / -2)',
          });
        }
      });
    });

    return {
      wrapper,
      content,
      arrow,
    };
  }

  return {
    update(newOpts: Config) {
      const fullNewOpts = deepMerge(defaults, newOpts);
      for (const k in newOpts) {
        const key = k as keyof Config;
        handleUpdate(key, fullNewOpts);
      }
      fullOpts = fullNewOpts;
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


function getElement(elem: Config['target']) {
  const element = typeof elem === 'string'
    ? document.querySelector(elem)
    : elem;

  if (!element) throw new Error('No element found.');
  return element;
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
