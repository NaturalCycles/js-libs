import{_ as a,o as n,c as e,ae as p}from"./chunks/framework.BxjyvXIc.js";const u=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"httpRequestError.md","filePath":"httpRequestError.md"}'),t={name:"httpRequestError.md"};function r(o,s,l,i,c,h){return n(),e("div",null,[...s[0]||(s[0]=[p(`<div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Backend makes a Fetch call to some API</span></span>
<span class="line"><span>API returns error1 with 500 and a message1</span></span>
<span class="line"><span>Fetcher wraps error1 with error2 which is a FetcherError</span></span>
<span class="line"><span>method</span></span>
<span class="line"><span>url</span></span>
<span class="line"><span>baseUrl?</span></span>
<span class="line"><span>statusCode</span></span>
<span class="line"><span>millis</span></span>
<span class="line"><span>message: 500 GET /someUrl</span></span>
<span class="line"><span>causedBy error1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>genericErrorHandler needs to return error2</span></span>
<span class="line"><span>it wraps error2 (FetchError) with error3: HttpError</span></span>
<span class="line"><span>Maybe there&#39;s just no need to do that wrapping?! Return ErrorObject as is</span></span>
<span class="line"><span>Requester (Fetcher) would always know httpStatusCode of the error they just received</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Why is HttpError needed?</span></span>
<span class="line"><span>For the Backend to set the right httpStatusCode</span></span>
<span class="line"><span>Maybe it&#39;s enough to just have it as AppError with httpStatusCode?</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Rename HttpError to HttpRequestError, which is the same as FetchError</span></span>
<span class="line"><span>HttpErrorResponse becomes BackendErrorResponseObject (detected by name and message)</span></span></code></pre></div>`,1)])])}const m=a(t,[["render",r]]);export{u as __pageData,m as default};
