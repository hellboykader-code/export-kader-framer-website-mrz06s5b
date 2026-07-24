import{t as e}from"./rolldown-runtime.Dh6celcD.mjs";import{B as t,I as n,P as r,R as i,T as a,c as o,k as s,o as c}from"./react.CEu8kCkm.mjs";import{D as l,G as u,i as d,j as f}from"./framer.Bomm-Wc0.mjs";import{h as p,o as m,p as h,t as g}from"./OIjZRBmWDcIE2B6qgG1j.SMmcAk2h.mjs";var _=e((()=>{g()}));function v({type:e,url:t,html:n,zoom:r,radius:i,border:a,style:s={}}){return e===`url`&&t?o(b,{url:t,zoom:r,radius:i,border:a,style:s}):e===`html`&&n?o(S,{html:n,style:s}):o(y,{style:s})}function y({style:e}){return o(`div`,{style:{minHeight:k(e),...p,overflow:`hidden`,...e},children:o(`div`,{style:M,children:`To embed a website or widget, add it to the properties\xA0panel.`})})}function b({url:e,zoom:t,radius:i,border:a,style:s}){let c=!s.height;/[a-z]+:\/\//.test(e)||(e=`https://`+e);let l=m(),[u,d]=n(l?void 0:!1);return r(()=>{if(!l)return;let t=!0;d(void 0);async function n(){let n=await fetch(`https://api.framer.com/functions/check-iframe-url?url=`+encodeURIComponent(e));if(n.status==200){let{isBlocked:e}=await n.json();t&&d(e)}else{let e=await n.text();console.error(e),d(Error(`This site can’t be reached.`))}}return n().catch(e=>{console.error(e),d(e)}),()=>{t=!1}},[e]),l&&c?o(O,{message:`URL embeds do not support auto height.`,style:s}):e.startsWith(`https://`)?u===void 0?o(D,{}):u instanceof Error?o(O,{message:u.message,style:s}):u===!0?o(O,{message:`Can’t embed ${e} due to its content security policy.`,style:s}):o(`iframe`,{src:e,style:{...A,...s,...a,zoom:t,borderRadius:i,transformOrigin:`top center`},loading:`lazy`,fetchPriority:l?`low`:`auto`,referrerPolicy:`no-referrer`,sandbox:x(l),allowFullScreen:!0,allow:`presentation; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; clipboard-write`}):o(O,{message:`Unsupported protocol.`,style:s})}function x(e){let t=[`allow-same-origin`,`allow-scripts`];return e||t.push(`allow-downloads`,`allow-forms`,`allow-modals`,`allow-orientation-lock`,`allow-pointer-lock`,`allow-popups`,`allow-popups-to-escape-sandbox`,`allow-presentation`,`allow-storage-access-by-user-activation`,`allow-top-navigation-by-user-activation`),t.join(` `)}function S({html:e,...t}){if(e.includes(`<\/script>`)){let n=e.includes(`</spline-viewer>`),r=e.includes(`<!-- framer-direct-embed -->`);return o(n||r?w:C,{html:e,...t})}return o(T,{html:e,...t})}function C({html:e,style:i}){let a=s(),[c,l]=n(0);r(()=>{let e=a.current?.contentWindow;function n(t){if(t.source!==e)return;let n=t.data;if(typeof n!=`object`||!n)return;let r=n.embedHeight;typeof r==`number`&&l(r)}return t.addEventListener(`message`,n),e?.postMessage(`getEmbedHeight`,`*`),()=>{t.removeEventListener(`message`,n)}},[]);let u=`
<html>
    <head>
        <style>
            html, body {
                margin: 0;
                padding: 0;
            }

            body {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            :root {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            * {
                box-sizing: border-box;
                -webkit-font-smoothing: inherit;
            }

            h1, h2, h3, h4, h5, h6, p, figure {
                margin: 0;
            }

            body, input, textarea, select, button {
                font-size: 12px;
                font-family: sans-serif;
            }
        </style>
    </head>
    <body>
        ${e}
        <script type="module">
            let height = 0

            function sendEmbedHeight() {
                window.parent.postMessage({
                    embedHeight: height
                }, "*")
            }

            const observer = new ResizeObserver((entries) => {
                if (entries.length !== 1) return
                const entry = entries[0]
                if (entry.target !== document.body) return

                height = entry.contentRect.height
                sendEmbedHeight()
            })

            observer.observe(document.body)

            window.addEventListener("message", (event) => {
                if (event.source !== window.parent) return
                if (event.data !== "getEmbedHeight") return
                sendEmbedHeight()
            })
        <\/script>
    <body>
</html>
`,d={...A,...i};return i.height||(d.height=c+`px`),o(`iframe`,{ref:a,style:d,srcDoc:u})}function w({html:e,style:t}){let n=s();return r(()=>{let t=n.current;if(t)return t.innerHTML=e,E(t),()=>{t.innerHTML=``}},[e]),o(`div`,{ref:n,style:{...j,...t}})}function T({html:e,style:t}){return o(`div`,{style:{...j,...t},dangerouslySetInnerHTML:{__html:e}})}function E(e){if(e instanceof Element&&e.tagName===`SCRIPT`){let t=document.createElement(`script`);t.text=e.innerHTML;for(let{name:n,value:r}of e.attributes)t.setAttribute(n,r);e.parentElement.replaceChild(t,e)}else for(let t of e.childNodes)E(t)}function D(){return o(`div`,{className:`framerInternalUI-componentPlaceholder`,style:{...h,overflow:`hidden`},children:o(`div`,{style:M,children:`Loading…`})})}function O({message:e,style:t}){return o(`div`,{className:`framerInternalUI-errorPlaceholder`,style:{minHeight:k(t),...h,overflow:`hidden`,...t},children:o(`div`,{style:M,children:e})})}function k(e){if(!e.height)return 200}var A,j,M,N=e((()=>{i(),c(),a(),u(),_(),l(v,{type:{type:d.Enum,defaultValue:`url`,displaySegmentedControl:!0,options:[`url`,`html`],optionTitles:[`URL`,`HTML`]},url:{title:`URL`,type:d.String,description:`Some websites don’t support embedding.`,hidden(e){return e.type!==`url`}},html:{title:`HTML`,type:d.String,displayTextArea:!0,hidden(e){return e.type!==`html`}},border:{title:`Border`,type:d.Border,optional:!0,hidden(e){return e.type!==`url`}},radius:{type:d.BorderRadius,title:`Radius`,hidden(e){return e.type!==`url`}},zoom:{title:`Zoom`,defaultValue:1,type:d.Number,hidden(e){return e.type!==`url`},min:.1,max:1,step:.1,displayStepper:!0}}),A={width:`100%`,height:`100%`,border:`none`},j={width:`100%`,height:`100%`,display:`flex`,flexDirection:`column`,justifyContent:`center`,alignItems:`center`},M={textAlign:`center`,minWidth:140}})),P,F,I,L=e((()=>{u(),f.loadFonts([`FS;Archivo-light`,`FS;Archivo-regular`,`FS;Archivo-italic`,`FS;Archivo-light italic`]),P=[{explicitInter:!0,fonts:[{family:`Archivo`,source:`fontshare`,style:`normal`,url:`https://framerusercontent.com/third-party-assets/fontshare/wf/HDCJIGGT2U6DURV6536JGTM6VWUIKBSN/ALDOEF2ZUO2T3XAAXI44RMXEPAEQ4BP2/VYFZGEBESZ2HUTOKHQIILYMFZUUHJZ56.woff2`,weight:`300`},{family:`Archivo`,source:`fontshare`,style:`normal`,url:`https://framerusercontent.com/third-party-assets/fontshare/wf/YSKLU24545WP65XCD7ZVOFPD6AKR3JSM/SPF276V6UKGPA6W5ZNFTEWBJXRSQNXCR/7BTLO3ZVFMNDGT63YATXTEALTKTYZUZG.woff2`,weight:`400`},{family:`Archivo`,source:`fontshare`,style:`italic`,url:`https://framerusercontent.com/third-party-assets/fontshare/wf/CAPUNOGRVOEFSVSVS2JLPSFY7X2SDN6Y/NBTUZADGJJK244MWHOCUJ4UOQCHXR3OZ/M4ILLQ6F2CHZIYSTJIVDF4ND4SCO5IEF.woff2`,weight:`400`},{family:`Archivo`,source:`fontshare`,style:`italic`,url:`https://framerusercontent.com/third-party-assets/fontshare/wf/BR4LYEAQ6HAWPQXWY5U4YQPZTKYWJ3TJ/NVEYZTYVQQCYS44KFM3PGGDY35K7WVQF/YNCWKXPLAUUSWVK7MS54HQRNIVJOSYYC.woff2`,weight:`300`}]}],F=[`.framer-tLjFP .framer-styles-preset-1iyse8i:not(.rich-text-wrapper), .framer-tLjFP .framer-styles-preset-1iyse8i.rich-text-wrapper p { --framer-font-family: "Archivo", "Archivo Placeholder", sans-serif; --framer-font-family-bold: "Archivo", "Archivo Placeholder", sans-serif; --framer-font-family-bold-italic: "Archivo", "Archivo Placeholder", sans-serif; --framer-font-family-italic: "Archivo", "Archivo Placeholder", sans-serif; --framer-font-open-type-features: normal; --framer-font-size: 16px; --framer-font-style: normal; --framer-font-style-bold: normal; --framer-font-style-bold-italic: italic; --framer-font-style-italic: italic; --framer-font-variation-axes: normal; --framer-font-weight: 300; --framer-font-weight-bold: 400; --framer-font-weight-bold-italic: 400; --framer-font-weight-italic: 300; --framer-letter-spacing: 0em; --framer-line-height: 1.2em; --framer-paragraph-spacing: 20px; --framer-text-alignment: left; --framer-text-color: var(--token-3f2e6a55-1fe3-44f5-b911-3396dc0a2611, #b5b5b5); --framer-text-decoration: none; --framer-text-stroke-color: initial; --framer-text-stroke-width: initial; --framer-text-transform: none; }`],I=`framer-tLjFP`}));export{v as a,L as i,F as n,N as o,P as r,I as t};
//# sourceMappingURL=vBXkcYeXt.k6tNovfl.mjs.map