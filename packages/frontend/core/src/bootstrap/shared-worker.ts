/**
 * This is a wrapper for SharedWorker,
 * added the `name` parameter to the `SharedWorker` URL so that
 * multiple `SharedWorkers` can share one script file.
 */
const rawSharedWorker = globalThis.SharedWorker;

// TODO(@eyhn): remove this when we can use single shared worker for all workspaces
function PatchedSharedWorker(
  urlParam: URL | string,
  options?: string | { name: string }
) {
  const url = typeof urlParam === 'string' ? new URL(urlParam) : urlParam;
  if (options) {
    url.searchParams.append(
      typeof options === 'string' ? options : options.name,
      ''
    );
  }
  return new rawSharedWorker(url, options);
}
// if SharedWorker is not supported, do nothing
if (rawSharedWorker) {
  globalThis.SharedWorker = PatchedSharedWorker as any;
}
