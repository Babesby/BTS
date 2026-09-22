const page=document.body.dataset.page||({"reports.html":"reports","gallery.html":"gallery"}[location.pathname.split('/').pop()]||'');
const root=document.body.dataset.root||'';
const navLink=([label,url,key])=>`<a href="${root}${url}"${page===key?' aria-current="page"':''}>${label}</a>`;
const workNav=[['Thematic Areas','thematic-areas.html','themes'],['Programmes','programmes.html','programmes'],['Explore Labs','projects.html','projects']];
const storyNav=[['Team','team.html','team'],['Blogs','blog.html','journal'],['Reports','reports.html','reports'],['Gallery','gallery.html','gallery'],['Volunteer','volunteer.html','volunteer']];
const navGroup=(label,items)=>`<div class="nav-group${items.some(([, ,key])=>page===key)?' is-current':''}"><button class="nav-trigger" type="button" aria-expanded="false">${label}</button><div class="nav-dropdown">${items.map(navLink).join('')}</div></div>`;
const header=`<header class="site-header"><div class="wrap header-inner"><a class="brand" href="${root}index.html" aria-label="Beyond the Science home"><img src="${root}assets/logo.svg" alt="Beyond the Science"></a><button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><i></i></button><nav class="nav" aria-label="Primary navigation">${navLink(['Home','index.html','home'])}${navLink(['About','about.html','about'])}${navGroup('Our work',workNav)}${navGroup('People & stories',storyNav)}<a class="nav-contact" href="${root}contact.html">Partner with us</a></nav></div></header>`;
const footer=`<footer class="site-footer"><div class="wrap footer-top"><div class="footer-statement"><h2>Knowledge that moves from evidence to action.</h2><a class="button" href="${root}contact.html">Start a conversation</a></div><div class="footer-col"><h3>Explore</h3><a href="${root}about.html">About BTS</a><a href="${root}thematic-areas.html">Thematic areas</a><a href="${root}programmes.html">Programmes</a><a href="${root}projects.html">Explore the labs</a><a href="${root}team.html">Team</a><a href="${root}reports.html">Reports</a></div><div class="footer-col"><h3>Connect</h3><a href="${root}blog.html">Blogs</a><a href="${root}gallery.html">Gallery</a><a href="${root}volunteer.html">Volunteer</a><a href="mailto:info@beyondthescience.org">info@beyondthescience.org</a></div></div><div class="wrap footer-bottom"><span>© <span data-year></span> Beyond the Science · Accra, Ghana</span><span>Research · Policy · Practice</span></div></footer>`;
document.querySelector('[data-site-header]')?.insertAdjacentHTML('afterbegin',header);
document.querySelector('[data-site-footer]')?.insertAdjacentHTML('afterbegin',footer);
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const logoSet=document.querySelector('.logo-track .logo-set');
if(logoSet){const repeat=logoSet.cloneNode(true);repeat.setAttribute('aria-hidden','true');repeat.querySelectorAll('a').forEach(link=>{link.tabIndex=-1;link.querySelectorAll('img').forEach(img=>img.alt='')});logoSet.parentElement.append(repeat)}
const toggle=document.querySelector('.menu-toggle');
const closeDropdowns=except=>document.querySelectorAll('.nav-group.is-open').forEach(group=>{if(group!==except){group.classList.remove('is-open');group.querySelector('.nav-trigger')?.setAttribute('aria-expanded','false')}});
const closeMenu=()=>{document.body.classList.remove('nav-open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open navigation');closeDropdowns()};
toggle?.addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',closeMenu));
document.querySelectorAll('.nav-trigger').forEach(trigger=>trigger.addEventListener('click',()=>{const group=trigger.closest('.nav-group'),open=!group.classList.contains('is-open');closeDropdowns(group);group.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open))}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(document.body.classList.contains('nav-open')){closeMenu();toggle?.focus()}else closeDropdowns()}});
document.addEventListener('click',event=>{if(!event.target.closest('.nav-group'))closeDropdowns();if(document.body.classList.contains('nav-open')&&!event.target.closest('.site-header'))closeMenu()});
window.addEventListener('resize',()=>{if(innerWidth>820&&document.body.classList.contains('nav-open'))closeMenu()});

const portfolioDirectory=document.querySelector('.portfolio-directory>.wrap');
if(portfolioDirectory){
  ['evidence-policy','enterprise','creative-art','media-narrative','institutional-toolkit','local-knowledge'].forEach(id=>{const section=document.getElementById(id);if(section)portfolioDirectory.append(section)});
}

const hero=document.querySelector('[data-hero-slider]');
if(hero){
  const slides=[...hero.querySelectorAll('[data-hero-slide]')],dots=[...hero.querySelectorAll('[data-hero-go]')];
  let current=0,timer;
  const show=index=>{current=(index+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===current);slide.setAttribute('aria-hidden',String(i!==current))});dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===current);if(i===current)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current')})};
  const play=()=>{clearInterval(timer);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(current+1),6500)};
  const restart=()=>{clearInterval(timer);play()};
  dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.heroGo));restart()}));
  hero.querySelector('[data-hero-next]')?.addEventListener('click',()=>{show(current+1);restart()});
  hero.addEventListener('mouseenter',()=>clearInterval(timer));hero.addEventListener('mouseleave',play);
  hero.addEventListener('focusin',()=>clearInterval(timer));hero.addEventListener('focusout',event=>{if(!hero.contains(event.relatedTarget))play()});
  hero.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){show(current+1);restart()}if(event.key==='ArrowLeft'){show(current-1);restart()}});
  show(0);play();
}

const typed=document.querySelector('[data-typewriter]');
if(typed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const words=typed.dataset.typewriter;
  const typeObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;typed.textContent='';typed.classList.add('is-typing');let i=0;const write=()=>{typed.textContent=words.slice(0,++i);if(i<words.length)setTimeout(write,42);else typed.classList.remove('is-typing')};write();typeObserver.disconnect()}),{threshold:.45});
  typeObserver.observe(typed);
}

if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const revealItems=[...document.querySelectorAll('main>section:not(.global-hero), .programme-link, .theme-tile, .field-grid figure')];
  revealItems.forEach(item=>item.classList.add('reveal'));
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}),{threshold:.08,rootMargin:'0px 0px -40px'});
  revealItems.forEach(item=>revealObserver.observe(item));
}

const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target,target=Number(el.dataset.count),suffix=el.dataset.suffix||'',start=performance.now();function run(now){const p=Math.min((now-start)/1100,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(target*e).toLocaleString()+suffix;if(p<1)requestAnimationFrame(run)}requestAnimationFrame(run);counterObserver.unobserve(el)}),{threshold:.45});
document.querySelectorAll('[data-count]').forEach(el=>counterObserver.observe(el));
const journalFilters=[...document.querySelectorAll('.filter')],journalPosts=[...document.querySelectorAll('.post')],filterStatus=document.querySelector('[data-filter-status]');
journalFilters.forEach(button=>button.addEventListener('click',()=>{
  const selected=button.dataset.filter;
  journalFilters.forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active))});
  let visible=0;
  journalPosts.forEach(post=>{const show=selected==='all'||post.dataset.category===selected;post.hidden=!show;if(show)visible++});
  if(filterStatus)filterStatus.textContent=selected==='all'?`Showing all ${visible} stories`:`Showing ${visible} ${selected} ${visible===1?'story':'stories'}`;
}));
const lightbox=document.getElementById('lightbox');
document.querySelectorAll('.gallery-item').forEach(button=>button.addEventListener('click',()=>{const source=button.querySelector('img'),target=lightbox?.querySelector('img');if(!lightbox||!target)return;target.src=source.src;target.alt=source.alt;lightbox.showModal()}));
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()})});
const regionStories={accra:['Greater Accra','National media, policy dialogue and climate storytelling connect evidence to wider public action.'],kumasi:['Ashanti Region','Research and institutional partnerships strengthen locally relevant climate responses.'],tamale:['Northern Ghana','Youth and community work supports resilience, inclusion and locally led adaptation.']};
document.querySelectorAll('[data-region]').forEach(button=>button.addEventListener('click',()=>{const data=regionStories[button.dataset.region];if(!data)return;document.querySelectorAll('[data-region]').forEach(pin=>{const active=pin===button;pin.classList.toggle('is-active',active);pin.setAttribute('aria-pressed',String(active))});document.querySelector('[data-region-title]').textContent=data[0];document.querySelector('[data-region-text]').textContent=data[1]}));
const countryNames={ghana:'Ghana',nigeria:'Nigeria',tanzania:'Tanzania',uganda:'Uganda',southafrica:'South Africa',benin:'Benin',cameroon:'Cameroon'};
function chooseCountry(key){if(!countryNames[key])return;document.querySelectorAll('[data-country],[data-country-choice]').forEach(control=>{const selected=(control.dataset.country||control.dataset.countryChoice)===key;control.classList.toggle('is-active',selected);control.setAttribute('aria-pressed',String(selected))});document.querySelector('[data-country-title]').textContent=countryNames[key];document.querySelector('[data-country-text]').textContent=key==='ghana'?'Home to BTS. Our work here connects climate research, policy, youth leadership, media and community practice.':`${countryNames[key]} is part of BTS’s work across Africa, connecting local priorities with research, institutions and collaborative climate action.`}
document.querySelectorAll('[data-country],[data-country-choice]').forEach(control=>control.addEventListener('click',()=>chooseCountry(control.dataset.country||control.dataset.countryChoice)));
