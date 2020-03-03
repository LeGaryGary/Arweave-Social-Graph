import { app, h } from 'hyperapp';
/** @jsx h */

import '../styles/bootstrap.min.css'
import '../styles/app.css';

import state from './state';

import SocialGraph from './components/SocialGraph'

const view = (state) => {
  return (
      <SocialGraph/>
  )
}

function onMount(main) {
}

let main;

const appArgs = {
  init: [
    state
  ],
  view,
  node: document.getElementById("app")
};

if (process.env.NODE_ENV !== 'production') {
  import('hyperapp-redux-devtools').then((devtools) => {
    main = devtools(app)(appArgs);

    onMount(main);
  });
} else {

  main = app(appArgs);

  onMount(main);
}
