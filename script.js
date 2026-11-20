// CONFIGURAÇÃO: use a URL do projeto e a chave PUBLICÁVEL do Supabase.
// Nunca coloque aqui a chave secreta do projeto.
const SUPABASE_URL = "https://lznssmovgpfncvaxgrgl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rhia7rXYUdgieZ4RROYp2w_pKsvIC9q";

const configurado = !SUPABASE_URL.includes("COLOQUE") && !SUPABASE_ANON_KEY.includes("COLE-AQUI");
const sb = configurado && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const views = ["authView","perfilView","appView"];
let usuarioAtual = null;
let bebeAtual = null;
let itensAtuais = [];
let kitsAtuais = [];
let modelosAtuais = [];
let modoCriarConta = false;
let souAdmin = false;

function mostrar(id) { views.forEach(v => $(v).classList.toggle("hidden", v !== id)); }
function feedback(id, msg, erro=false) { const el=$(id); if(el){el.textContent=msg;el.style.color=erro?"#b44d65":"";} }
function toast(msg) { const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800); }
function erroAmigavel(e) {
  const m = e?.message || "Não foi possível concluir. Tente novamente.";
  if (m.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Este e-mail já tem uma conta. Use a opção Entrar.";
  if (m.includes("Email not confirmed")) return "Confirme seu e-mail pelo link enviado e depois entre.";
  if (m.includes("row-level security")) return "A proteção do banco bloqueou esta ação. Avise a administradora para conferir as permissões.";
  return m;
}
async function verificarAdmin() {
  const {data,error}=await sb.from("app_admins").select("user_id").eq("user_id",usuarioAtual.id).maybeSingle();
  if(error && error.code!=="PGRST116") console.warn(error);
  souAdmin=!!data;
  $("adminNav").classList.toggle("hidden",!souAdmin);
}

async function carregarPerfilEBebe() {
  const {data:perfil,error:pErr}=await sb
    .from("profiles")
    .select("*")
    .eq("id",usuarioAtual.id)
    .maybeSingle();

  if(pErr) throw pErr;

  if(!perfil || !perfil.nome) {
    $("nomeBebe").value="";
    mostrar("perfilView");
    return;
  }

  const {data:bebes,error:bErr}=await sb
    .from("babies")
    .select("*")
    .eq("user_id",usuarioAtual.id)
    .order("criado_em",{ascending:true})
    .limit(1);

  if(bErr) throw bErr;

  if(!bebes || !bebes.length) {
    mostrar("perfilView");
    return;
  }

  bebeAtual=bebes[0];

  $("tituloBebe").textContent=bebeAtual.nome || "Meu bebê";

  const data=bebeAtual.data_prevista
    ? new Date(bebeAtual.data_prevista+"T12:00:00").toLocaleDateString("pt-BR")
    : "";

  $("subtituloBebe").textContent=[
    data ? "Previsão de chegada: "+data : "",
    bebeAtual.cidade,
    bebeAtual.estado
  ].filter(Boolean).join(" • ");

  await verificarAdmin();
  await carregarDados();
  mostrar("appView");
}

async function carregarDados() {
  const [itensRes,kitsRes,modelosRes]=await Promise.all([
    sb.from("user_items")
      .select("*")
      .eq("user_id",usuarioAtual.id)
      .eq("baby_id",bebeAtual.id)
      .order("criado_em",{ascending:false}),

    sb.from("kits")
      .select("*")
      .eq("user_id",usuarioAtual.id)
      .eq("baby_id",bebeAtual.id)
      .order("criado_em",{ascending:false}),

    sb.from("templates")
      .select("*")
      .eq("publicado",true)
      .order("nome")
  ]);

  if(itensRes.error) throw itensRes.error;
  if(kitsRes.error) throw kitsRes.error;
  if(modelosRes.error) throw modelosRes.error;

  itensAtuais=itensRes.data||[];
  kitsAtuais=kitsRes.data||[];
  modelosAtuais=modelosRes.data||[];

  renderizarItens();
  renderizarKits();
  atualizarResumo();

  if(souAdmin) await carregarModelosAdmin();
}

function atualizarResumo(){
  const total=itensAtuais.length;
  const tenho=itensAtuais.filter(i=>i.tenho).length;
  const pct=total?(tenho/total*100).toFixed(2):"0";

  $("totalItens").textContent=total;
  $("itensTenho").textContent=tenho;
  $("itensFaltam").textContent=total-tenho;
  $("progressoTexto").textContent=pct+"%";
  $("progressoBarra").style.width=pct+"%";
}
function renderizarItens(){
  const filtro=$("filtroCategoria").value;
  const cats=[...new Set(itensAtuais.map(i=>i.categoria).filter(Boolean))].sort();
  $("filtroCategoria").innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  $("filtroCategoria").value=filtro;
  const lista=itensAtuais.filter(i=>!filtro||i.categoria===filtro);
  $("listaItens").innerHTML=lista.length?lista.map(i=>`<article class="item-row ${i.tenho?"done":""}">
    <input type="checkbox" aria-label="Marcar como já tenho" data-check="${i.id}" ${i.tenho?"checked":""}>
    <div class="item-info"><strong>${esc(i.nome)}</strong><small>${esc(i.categoria||"Sem categoria")} • Qtd.: ${i.quantidade||1}${i.tamanho?" • "+esc(i.tamanho):""}${i.detalhes?" • "+esc(i.detalhes):""}</small></div>
    <button class="delete" type="button" data-delete="${i.id}">Excluir</button>
  </article>`).join(""):'<div class="panel muted">Sua lista ainda está vazia. Adicione seu primeiro item no resumo.</div>';
}
function renderizarKits(){
  $("listaKits").innerHTML=kitsAtuais.length?kitsAtuais.map(k=>`<article class="item-row"><div class="item-info"><strong>${esc(k.nome)}</strong><small>Quantidade: ${k.quantidade_kits||1}${k.observacao?" • "+esc(k.observacao):""}</small></div><button class="delete" data-kitdelete="${k.id}" type="button">Excluir</button></article>`).join(""):'<div class="panel muted">Você ainda não cadastrou kits.</div>';
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function entrarNoApp(){
  if(!sb){$("avisoConfig").classList.remove("hidden");return;}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){mostrar("authView");return;}
  usuarioAtual=session.user;
  $("sairBtn").classList.remove("hidden");
  try{await carregarPerfilEBebe();}catch(e){toast(erroAmigavel(e));console.error(e);}
}
$("entrarTab").addEventListener("click",()=>{modoCriarConta=false;$("entrarTab").classList.add("active");$("criarTab").classList.remove("active");$("authSubmit").textContent="Entrar";$("senha").autocomplete="current-password";feedback("authFeedback","");});
$("criarTab").addEventListener("click",()=>{modoCriarConta=true;$("criarTab").classList.add("active");$("entrarTab").classList.remove("active");$("authSubmit").textContent="Criar conta";$("senha").autocomplete="new-password";feedback("authFeedback","");});
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!sb){$("avisoConfig").classList.remove("hidden");return;}
  const email=$("email").value.trim(),password=$("senha").value;
  $("authSubmit").disabled=true;feedback("authFeedback","Aguarde...");
  try{
    if(modoCriarConta){
      const {data,error}=await sb.auth.signUp({email,password});if(error)throw error;
      if(data.session){usuarioAtual=data.user;$("sairBtn").classList.remove("hidden");mostrar("perfilView");}
      else feedback("authFeedback","Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.");
    }else{
      const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
      await entrarNoApp();
    }
  }catch(err){feedback("authFeedback",erroAmigavel(err),true);}
  finally{$("authSubmit").disabled=false;}
});


$("perfilForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!usuarioAtual)return;

  feedback("perfilFeedback","Salvando...");

  try{
    const nome=$("nomeBebe").value.trim();

    const {error:pe}=await sb.from("profiles").upsert({
      id:usuarioAtual.id,
      nome:usuarioAtual.email?.split("@")[0]||"Usuário"
    },{onConflict:"id"});

    if(pe)throw pe;

    const {data:modelos,error:me}=await sb
      .from("templates")
      .select("id,tipo")
      .eq("publicado",true);

    if(me)throw me;

    const modeloEscolhido=modelos.find(
      m=>m.tipo===$("tipoEnxoval").value
    );

    if(!modeloEscolhido){
      throw new Error("Não foi possível encontrar o modelo escolhido.");
    }

    const payload={
      user_id:usuarioAtual.id,
      template_id:modeloEscolhido.id,
      nome,
      sexo:$("sexoBebe").value,
      data_prevista:$("dataParto").value||null,
      regiao:$("regiao").value||null,
      estado:$("estado").value.trim().toUpperCase()||null,
      cidade:$("cidade").value.trim()||null
    };

    const {data:bebe,error:be}=await sb
      .from("babies")
      .insert(payload)
      .select()
      .single();

    if(be)throw be;

    bebeAtual=bebe;

    const {data:itensModelo,error:ie}=await sb
      .from("template_items")
      .select("id,nome,categoria,quantidade,tamanho,detalhes")
      .eq("template_id",modeloEscolhido.id)
      .order("ordem",{ascending:true});

    if(ie)throw ie;

    if(!itensModelo || !itensModelo.length){
      throw new Error("O modelo escolhido não possui itens cadastrados.");
    }

    const itensParaSalvar=itensModelo.map(item=>({
      user_id:usuarioAtual.id,
      baby_id:bebe.id,
      template_item_id:item.id,
      nome:item.nome,
      categoria:item.categoria,
      quantidade:item.quantidade,
      tamanho:item.tamanho,
      detalhes:item.detalhes,
      tenho:0
    }));

    const {error:uiError}=await sb
      .from("user_items")
      .insert(itensParaSalvar);

    if(uiError)throw uiError;

    await verificarAdmin();
    await carregarDados();

    $("tituloBebe").textContent=nome;
    $("subtituloBebe").textContent=[
      payload.data_prevista
        ? new Date(payload.data_prevista+"T12:00:00").toLocaleDateString("pt-BR")
        : "",
      payload.cidade,
      payload.estado
    ].filter(Boolean).join(" • ");

    mostrar("appView");
    toast("Perfil e enxoval salvos com sucesso!");

  }catch(err){
    feedback("perfilFeedback",erroAmigavel(err),true);
  }
});


$("novoItemForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!bebeAtual)return;
  const payload={user_id:usuarioAtual.id,baby_id:bebeAtual.id,nome:$("itemNome").value.trim(),categoria:$("itemCategoria").value,quantidade:Number($("itemQuantidade").value)||1,tamanho:$("itemTamanho").value.trim()||null,detalhes:$("itemDetalhes").value.trim()||null,tenho:0};
  try{const {error}=await sb.from("user_items").insert(payload);if(error)throw error;e.target.reset();$("itemQuantidade").value=1;await carregarDados();feedback("itemFeedback","Item adicionado!");}
  catch(err){feedback("itemFeedback",erroAmigavel(err),true);}
});
$("listaItens").addEventListener("change",async e=>{
  const id=e.target.dataset.check;if(!id)return;
  const {error}=await sb.from("user_items").update({tenho:e.target.checked ? 1 : 0}).eq("id",id).eq("user_id",usuarioAtual.id);
  if(error){toast(erroAmigavel(error));return;}await carregarDados();
});

$("listaItens").addEventListener("click",async e=>{

  const editarId=e.target.dataset.edit;

  if(editarId){
    const item=itensAtuais.find(i=>i.id===editarId);
    if(!item)return;

    $("editarItemId").value=item.id;
    $("editarNome").value=item.nome||"";
    $("editarCategoria").value=item.categoria||"";
    $("editarQuantidade").value=item.quantidade||1;
    $("editarTamanho").value=item.tamanho||"";
    $("editarCor").value=item.cor||"";
    $("editarDetalhes").value=item.detalhes||"";
    $("editarPreco").value=item.preco??0;
    $("editarLoja").value=item.loja||"";
    $("editarLink").value=item.link||"";
    $("editarObservacao").value=item.observacao||"";

    $("editarItemArea").hidden=false;
    $("editarItemArea").scrollIntoView({behavior:"smooth"});
    return;
  }

  const id=e.target.dataset.delete;
  if(!id)return;

  if(!confirm("Excluir este item do seu enxoval?"))return;

  const {error}=await sb.from("user_items")
    .delete()
    .eq("id",id)
    .eq("user_id",usuarioAtual.id);

  if(error)toast(erroAmigavel(error));
  else{
    await carregarDados();
    toast("Item excluído.");
  }
});

$("filtroCategoria").addEventListener("change",renderizarItens);
$("novoKitForm").addEventListener("submit",async e=>{
  e.preventDefault();const payload={user_id:usuarioAtual.id,baby_id:bebeAtual.id,nome:$("kitNome").value.trim(),quantidade_kits:Number($("kitQuantidade").value)||1,observacao:$("kitObservacao").value.trim()||null};
  try{const {error}=await sb.from("kits").insert(payload);if(error)throw error;e.target.reset();$("kitQuantidade").value=1;await carregarDados();feedback("kitFeedback","Kit cadastrado!");}catch(err){feedback("kitFeedback",erroAmigavel(err),true);}
});
$("listaKits").addEventListener("click",async e=>{
  const id=e.target.dataset.kitdelete;if(!id)return;if(!confirm("Excluir este kit?"))return;
  const {error}=await sb.from("kits").delete().eq("id",id).eq("user_id",usuarioAtual.id);if(error)toast(erroAmigavel(error));else{await carregarDados();toast("Kit excluído.");}
});
document.querySelectorAll(".nav-button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".nav-button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".content-section").forEach(s=>s.classList.toggle("hidden",s.id!==b.dataset.section));}));
async function carregarModelosAdmin(){
  if(!souAdmin)return;
  const {data,error}=await sb.from("templates").select("*").order("nome");if(error){toast(erroAmigavel(error));return;}
  const modelos=data||[];
  $("modeloEscolhido").innerHTML=modelos.map(m=>`<option value="${m.id}">${esc(m.nome)}</option>`).join("");
  $("listaModelos").innerHTML=modelos.length?modelos.map(m=>`<article class="item-row"><div class="item-info"><strong>${esc(m.nome)}</strong><small>${esc(m.tipo||"")} • ${m.publicado?"Publicado":"Rascunho"}${m.descricao?" • "+esc(m.descricao):""}</small></div><button class="delete" type="button" data-publicar="${m.id}" data-status="${m.publicado}">${m.publicado?"Ocultar":"Publicar"}</button></article>`).join(""):'<p class="muted">Nenhum modelo criado ainda.</p>';
}
$("novoModeloForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!souAdmin)return;
  const payload={nome:$("modeloNome").value.trim(),tipo:$("modeloTipo").value,descricao:$("modeloDescricao").value.trim()||null,publicado:true};
  try{const {error}=await sb.from("templates").insert(payload);if(error)throw error;e.target.reset();await carregarModelosAdmin();feedback("modeloFeedback","Modelo criado e publicado.");}catch(err){feedback("modeloFeedback",erroAmigavel(err),true);}
});
$("novoItemModeloForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!souAdmin)return;
  const payload={template_id:$("modeloEscolhido").value,nome:$("modeloItemNome").value.trim(),categoria:$("modeloItemCategoria").value.trim(),quantidade:Number($("modeloItemQtd").value)||1,tamanho:$("modeloItemTamanho").value.trim()||null,detalhes:$("modeloItemDetalhes").value.trim()||null};
  try{const {error}=await sb.from("template_items").insert(payload);if(error)throw error;e.target.reset();await carregarModelosAdmin();feedback("modeloItemFeedback","Item adicionado ao modelo.");}catch(err){feedback("modeloItemFeedback",erroAmigavel(err),true);}
});
$("listaModelos").addEventListener("click",async e=>{
  const id=e.target.dataset.publicar;if(!id)return;const novo=e.target.dataset.status!=="true";
  const {error}=await sb.from("templates").update({publicado:novo}).eq("id",id);if(error)toast(erroAmigavel(error));else{await carregarModelosAdmin();toast(novo?"Modelo publicado.":"Modelo ocultado.");}
});
$("sairBtn").addEventListener("click",async()=>{if(sb)await sb.auth.signOut();usuarioAtual=null;bebeAtual=null;$("sairBtn").classList.add("hidden");mostrar("authView");});
if(sb){sb.auth.onAuthStateChange((_event,session)=>{if(session){usuarioAtual=session.user;}else{usuarioAtual=null;mostrar("authView");$("sairBtn").classList.add("hidden");}});entrarNoApp();}
else{$("avisoConfig").classList.remove("hidden");mostrar("authView");}
