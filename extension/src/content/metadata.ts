export function extractMetadata() {
  const title = document.title || '';
  
  const descTag = document.querySelector('meta[name="description"]');
  const description = descTag ? descTag.getAttribute('content') || '' : '';

  const ogTitleTag = document.querySelector('meta[property="og:title"]');
  const ogTitle = ogTitleTag ? ogTitleTag.getAttribute('content') || '' : '';

  const ogDescTag = document.querySelector('meta[property="og:description"]');
  const ogDescription = ogDescTag ? ogDescTag.getAttribute('content') || '' : '';

  return {
    title,
    description,
    ogTitle,
    ogDescription
  };
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_METADATA') {
      sendResponse(extractMetadata());
    }
  });
}
