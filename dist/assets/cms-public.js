function btsFormatDate(date){
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`));
}

function contentUrl(file){return new URL(file,document.baseURI).href}

async function contentFile(file){
  const response=await fetch(contentUrl(file),{cache:'no-store'});
  if(!response.ok)throw new Error(`Could not load ${file}`);
  return response.json();
}

function btsStoryCard(post){
  const link=document.createElement('a');link.className='post';link.dataset.category='climate';link.href=`/article?id=${encodeURIComponent(post.id)}`;
  const image=document.createElement('img');image.src=post.image;image.alt=post.title;image.loading='lazy';
  const copy=document.createElement('div');copy.className='post-copy';
  const meta=document.createElement('small');meta.textContent=`BTS story · ${btsFormatDate(post.published_date)}`;
  const title=document.createElement('h2');title.textContent=post.title;
  const heading=document.createElement('p');heading.textContent=post.heading;
  const action=document.createElement('b');action.textContent='Read article';
  copy.append(meta,title,heading,action);link.append(image,copy);return link;
}

function btsGalleryItem(item){
  const button=document.createElement('button');button.className='gallery-item';button.type='button';
  const image=document.createElement('img');image.src=item.image;image.alt=item.title;image.loading='lazy';
  const title=document.createElement('span');title.textContent=item.title;
  button.append(image,title);return button;
}

function appendTextWithBreaks(element,text){
  text.split('\n').forEach((line,index)=>{if(index)element.append(document.createElement('br'));element.append(document.createTextNode(line))});
}

function btsRenderBody(text,heading){
  const fragment=document.createDocumentFragment();
  if(heading){const intro=document.createElement('p');intro.className='lede';intro.textContent=heading;fragment.append(intro)}
  text.trim().split(/\n\s*\n/).filter(Boolean).forEach(block=>{
    const clean=block.trim();let element;
    if(clean.startsWith('## ')){element=document.createElement('h2');element.textContent=clean.slice(3).trim()}
    else if(clean.startsWith('> ')){element=document.createElement('blockquote');appendTextWithBreaks(element,clean.replace(/^> ?/gm,''))}
    else{element=document.createElement('p');appendTextWithBreaks(element,clean)}
    fragment.append(element);
  });
  return fragment;
}

async function loadManagedStories(){
  const grid=document.querySelector('.journal-grid');if(!grid)return;
  try{const posts=await contentFile('content/posts.json');[...posts].reverse().forEach(post=>grid.prepend(btsStoryCard(post)));document.dispatchEvent(new CustomEvent('bts-content-loaded'))}
  catch(error){console.warn('Repository stories are temporarily unavailable.',error)}
}

async function loadManagedGallery(){
  const grid=document.querySelector('.field-archive .gallery-grid');if(!grid)return;
  try{const items=await contentFile('content/gallery.json');[...items].reverse().forEach(item=>grid.prepend(btsGalleryItem(item)))}
  catch(error){console.warn('Repository gallery images are temporarily unavailable.',error)}
}

async function loadManagedArticle(){
  const id=new URLSearchParams(location.search).get('id');const body=document.querySelector('[data-article-body]');if(!id||!body)return;
  try{
    const posts=await contentFile('content/posts.json');const post=posts.find(item=>item.id===id);if(!post)throw new Error('Story not found');
    document.title=`${post.title} | Beyond the Science`;document.querySelector('[data-article-category]').textContent='BTS story';document.querySelector('[data-article-title]').textContent=post.title;document.querySelector('[data-article-meta]').textContent=btsFormatDate(post.published_date);
    const image=document.querySelector('[data-article-image]');image.src=post.image;image.alt=post.title;body.replaceChildren(btsRenderBody(post.body,post.heading));
  }catch{
    document.querySelector('[data-article-title]').textContent='Story unavailable';document.querySelector('[data-article-meta]').textContent='Please return to the BTS blogs.';document.querySelector('[data-article-image]').hidden=true;body.textContent='This story could not be loaded.';
  }
}

loadManagedStories();loadManagedGallery();loadManagedArticle();
