(async()=>{
const $=s=>document.querySelector(s),frame=$('#preview');let name=$('#themes')?.selectedOptions[0]?.textContent||'theme';
const source=await fetch('theme-preview.svg?v=2').then(r=>r.text());
function artwork(){const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement,root=frame.contentDocument?.documentElement;if(!root)return svg;const cs=frame.contentWindow.getComputedStyle(root);for(const el of svg.querySelectorAll('[data-token]')){el.setAttribute(el.dataset.paint||'fill',cs.getPropertyValue(el.dataset.token).trim()||'transparent');el.removeAttribute('data-token');el.removeAttribute('data-paint')}return svg}
function render(){$('#theme-artwork-image').replaceChildren(document.importNode(artwork(),true))}
addEventListener('theme-updated',e=>{name=e.detail.name;render()});frame.addEventListener('load',render);render();
const ru={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
function filename(){return 'theme-preview-'+([...name.toLowerCase()].map(c=>ru[c]??c).join('').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'theme')+'-'+(frame.contentDocument?.documentElement.dataset.colorMode==='dark'?'dark':'light')}
function save(blob,ext){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename()+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const serialize=()=>new XMLSerializer().serializeToString(artwork());
$('#preview-svg').onclick=()=>save(new Blob([serialize()],{type:'image/svg+xml;charset=utf-8'}),'svg');
$('#preview-png').onclick=async()=>{const button=$('#preview-png');button.disabled=true;let url;try{url=URL.createObjectURL(new Blob([serialize()],{type:'image/svg+xml;charset=utf-8'}));const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=576;canvas.height=348;canvas.getContext('2d').drawImage(img,0,0,576,348);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();save(blob,'png')}catch{const status=$('#status');status.hidden=false;status.textContent='Не удалось сохранить PNG. Попробуйте ещё раз.'}finally{if(url)URL.revokeObjectURL(url);button.disabled=false}};
})();
