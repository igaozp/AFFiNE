import './dispose';
import './iterator-helpers';
import './promise-with-resolvers';

import { polyfillEventLoop } from './request-idle-callback';
import { polyfillResizeObserver } from './resize-observer';

polyfillResizeObserver();
polyfillEventLoop();
