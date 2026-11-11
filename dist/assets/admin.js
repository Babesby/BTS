const loginView=document.querySelector('[data-login-view]');
const dashboard=document.querySelector('[data-dashboard]');
const loginForm=document.querySelector('[data-login-form]');
const loginStatus=document.querySelector('[data-login-status]');
const storyForm=document.querySelector('[data-story-form]');
const galleryForm=document.querySelector('[data-gallery-form]');

function status(element,message,type=''){
  element.textContent=message;
  element.className=`form-status${type?` is-${type}`:''}`;
}

async function request(action,options={}){
  const response=await fetch(`/api/cms?action=${encodeURIComponent(action)}`,{credentials:'same-origin',...options});
  let data={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data.error||'Something went wrong.');
  return data;
}

function formatDate(date){
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00`));
}

function toBase64(buffer){
  let binary='';const bytes=new Uint8Array(buffer);const size=0x8000;
  for(let index=0;index<bytes.length;index+=size)binary+=String.fromCharCode(...bytes.subarray(index,index+size));
  return btoa(binary);
}

async function prepareImage(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('Choose a valid image.');
  if(file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
  const source=URL.createObjectURL(file);
  try{
    const image=await new Promise((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(new Error('The image could not be read.'));element.src=source});
    const maximum=1800;const scale=Math.min(1,maximum/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d',{alpha:true}).drawImage(image,0,0,canvas.width,canvas.height);
    let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
    if(blob&&blob.size>3*1024*1024)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.68));
    if(!blob)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
    if(!blob)throw new Error('The image could not be prepared.');
    if(blob.size>3*1024*1024)throw new Error('The prepared image is still too large. Please use a smaller image.');
    const extension=blob.type==='image/webp'?'.webp':'.jpg';
    return {name:file.name.replace(/\.[^.]+$/,extension),type:blob.type,data:toBase64(await blob.arrayBuffer())};
  }finally{URL.revokeObjectURL(source)}
}

function contentRow(item,type){
  const row=document.createElement('article');row.className='content-row';
  const image=document.createElement('img');image.src=item.image_url||item.image;image.alt='';
  const copy=document.createElement('div');const title=document.createElement('h4');title.textContent=item.title;
  const meta=document.createElement('p');meta.textContent=type==='post'?formatDate(item.published_date):'Gallery image';
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
  remove.addEventListener('click',async()=>{
    if(!confirm(`Remove “${item.title}” from the website?`))return;
    remove.disabled=true;
    try{await request(type==='post'?'delete-post':'delete-gallery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id})});await loadContent()}
    catch(error){alert(error.message);remove.disabled=false}
  });
  copy.append(title,meta);row.append(image,copy,remove);return row;
}

async function loadContent(){
  const data=await request('list');
  const storyList=document.querySelector('[data-story-list]');storyList.replaceChildren();
  data.posts.forEach(post=>storyList.append(contentRow(post,'post')));
  if(!data.posts.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='No new stories have been published through this desk yet.';storyList.append(empty)}
  document.querySelector('[data-story-count]').textContent=`${data.posts.length} ${data.posts.length===1?'story':'stories'}`;
  const galleryList=document.querySelector('[data-gallery-list]');galleryList.replaceChildren();
  data.gallery.forEach(item=>galleryList.append(contentRow(item,'gallery')));
  if(!data.gallery.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='No new images have been added through this desk yet.';galleryList.append(empty)}
  document.querySelector('[data-gallery-count]').textContent=`${data.gallery.length} ${data.gallery.length===1?'image':'images'}`;
}

async function showDashboard(){
  loginView.hidden=true;dashboard.hidden=false;
  if(!storyForm.elements.date.value)storyForm.elements.date.value=new Date().toISOString().slice(0,10);
  try{await loadContent()}catch(error){if(/access|required|unauthorized/i.test(error.message))showLogin();else status(document.querySelector('[data-story-status]'),error.message,'error')}
}
function showLogin(){dashboard.hidden=true;loginView.hidden=false}

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=loginForm.querySelector('button');button.disabled=true;status(loginStatus,'Checking access…');
  try{await request('login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:loginForm.elements.password.value})});loginForm.reset();status(loginStatus,'');await showDashboard()}
  catch(error){status(loginStatus,error.message,'error')}finally{button.disabled=false}
});

storyForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=storyForm.querySelector('button[type=submit]');const message=document.querySelector('[data-story-status]');button.disabled=true;status(message,'Preparing image and publishing story…');
  try{
    const image=await prepareImage(storyForm.elements.image.files[0]);
    await request('publish-post',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:storyForm.elements.title.value,heading:storyForm.elements.heading.value,date:storyForm.elements.date.value,body:storyForm.elements.body.value,image})});
    storyForm.reset();storyForm.elements.date.value=new Date().toISOString().slice(0,10);status(message,'Story committed. It will appear after the connected deployment finishes.','success');await loadContent();
  }catch(error){status(message,error.message,'error')}finally{button.disabled=false}
});

galleryForm.addEventListener('submit',async event=>{
  event.preventDefault();const button=galleryForm.querySelector('button[type=submit]');const message=document.querySelector('[data-gallery-status]');button.disabled=true;status(message,'Preparing and adding image…');
  try{
    const image=await prepareImage(galleryForm.elements.image.files[0]);
    await request('add-gallery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:galleryForm.elements.title.value,image})});
    galleryForm.reset();status(message,'Image committed. It will appear after the connected deployment finishes.','success');await loadContent();
  }catch(error){status(message,error.message,'error')}finally{button.disabled=false}
});

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-tab]').forEach(tab=>tab.classList.toggle('is-active',tab===button));
  document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==button.dataset.tab);
}));

document.querySelector('[data-logout]').addEventListener('click',async()=>{try{await request('logout',{method:'POST'})}finally{showLogin()}});
request('session').then(data=>data.authenticated?showDashboard():showLogin()).catch(showLogin);
