<script lang="ts">
  import { tooltip, type Config } from '$lib';
  import '$lib/styles.scss';

  const opts: Config = {
    content: 'Hello, tooltip!',
    target: '#layers',
    placement: 'bottom',
  };

  setTimeout(() => {
    opts.placement = 'bottom-end';
  }, 2000);
</script>

<main>
  <img src="https://picsum.photos/1920/1080" alt="picsum" />
  <h1 use:tooltip={opts}>Hello, world!</h1>
</main>
<div id="layers" />

<style>
  :root {
    color-scheme: light dark;
  }
  :global(*) {
    margin: 0;
  }

  main {
    display: grid;
    place-items: center;
    position: relative;
    isolation: isolate;
    width: 100dvw;
    height: 100dvh;
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
    object-fit: cover;
    z-index: -1;
    filter: blur(4px) brightness(0.75);
  }
</style>
