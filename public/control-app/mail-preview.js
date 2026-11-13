import { mailPreviewStyles } from './mail-preview-styles.js';

// Mail remains sandboxed with no scripts. Translate the report's known inline
// styles into external CSS classes without weakening the application CSP.
export function mailPreviewDocument(markup) {
  const parsed=new DOMParser().parseFromString(markup || '','text/html');
  for(const element of parsed.querySelectorAll('script,base,link,meta,object,embed,iframe,form'))element.remove();
  for(const element of parsed.querySelectorAll('*')) {
    for(const attribute of [...element.attributes]) {
      if(attribute.name.startsWith('on'))element.removeAttribute(attribute.name);
    }
    if(element.hasAttribute('style')) {
      const index=mailPreviewStyles.indexOf(element.getAttribute('style'));
      element.removeAttribute('style');
      if(index>=0)element.classList.add('bonyeon-mail-'+index);
    }
    if(element.hasAttribute('href')) {
      try {if(!['https:','http:'].includes(new URL(element.getAttribute('href'),location.href).protocol))element.removeAttribute('href');}
      catch {element.removeAttribute('href');}
    }
  }
  const charset=parsed.createElement('meta');charset.charset='utf-8';
  const stylesheet=parsed.createElement('link');stylesheet.rel='stylesheet';
  stylesheet.href=new URL('/control-app/mail-preview.css',location.origin).href;
  parsed.head.replaceChildren(charset,stylesheet);
  return '<!doctype html>'+parsed.documentElement.outerHTML;
}
