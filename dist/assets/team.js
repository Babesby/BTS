const teamDialog=document.querySelector('[data-team-dialog]');
const teamDialogContent=document.querySelector('[data-team-dialog-content]');
let teamTrigger=null;

function openTeamProfile(key,trigger){
  const template=document.querySelector(`#team-profile-${key}`);
  if(!teamDialog||!teamDialogContent||!template)return;
  teamTrigger=trigger;
  teamDialogContent.replaceChildren(template.content.cloneNode(true));
  teamDialog.showModal();
}

function closeTeamProfile(){
  if(!teamDialog?.open)return;
  teamDialog.close();
}

document.querySelectorAll('[data-team-open]').forEach(button=>{
  button.addEventListener('click',()=>openTeamProfile(button.dataset.teamOpen,button));
});

document.querySelector('[data-team-close]')?.addEventListener('click',closeTeamProfile);

teamDialog?.addEventListener('click',event=>{
  if(event.target===teamDialog)closeTeamProfile();
});

teamDialog?.addEventListener('close',()=>{
  teamDialogContent?.replaceChildren();
  teamTrigger?.focus();
  teamTrigger=null;
});
