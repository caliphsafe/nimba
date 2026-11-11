
(() => {
  const STATE={orders:[],dashboard:null};
  const $=id=>document.getElementById(id);
  const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const cash=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0));
  const dt=v=>v?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(v)):"—";
  const qty=o=>(o?.lineItems?.nodes||[]).reduce((s,i)=>s+Number(i.quantity||0),0);
  const total=o=>Number(o?.totalPriceSet?.shopMoney?.amount||0);
  const customer=o=>[o?.customer?.firstName,o?.customer?.lastName].filter(Boolean).join(" ")||o?.email||"Guest";
  let installed=false;

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  ready(()=>{let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},60)});

  function install(){
    if(installed) return true;
    const nav=document.querySelector(".admin-sidebar nav");
    const main=document.querySelector(".admin-main");
    if(!nav||!main) return false;
    ensureViews(main);
    rebuildNav(nav);
    bindNav(nav);
    bindControls();
    installed=true;
    return true;
  }

  function ensureViews(main){
    if(!$("view-fulfillment")) main.insertAdjacentHTML("beforeend",`
      ${view("fulfillment","Operations","Fulfillment",`
        <div class="ops-toolbar"><input id="ops-fulfillment-search" type="search" placeholder="Search order or customer"><select id="ops-fulfillment-filter"><option value="OPEN">Needs action</option><option value="ALL">All orders</option></select><button class="ops-button secondary" id="ops-fulfillment-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-fulfillment-metrics"></div><div class="ops-panel"><div class="ops-panel-head"><div><h2>Shipping Queue</h2><p>Orders that still need fulfillment.</p></div></div><div class="ops-list" id="ops-fulfillment-list"></div></div>
      `)}
      ${view("returns","Post Purchase","Returns",`
        <div class="ops-note">Review refunded and partially-refunded orders. This screen does not issue refunds or restock inventory.</div>
        <div class="ops-toolbar"><input id="ops-returns-search" type="search" placeholder="Search order or customer"><select id="ops-returns-filter"><option value="ALL">Refunded + partial</option><option value="REFUNDED">Refunded</option><option value="PARTIALLY_REFUNDED">Partially refunded</option></select><button class="ops-button secondary" id="ops-returns-refresh">Refresh</button></div><div class="ops-list" id="ops-returns-list"></div>
      `)}
      ${view("analytics","Performance","Analytics",`
        <div class="ops-panel-head"><div><p class="ops-kicker">Last 30 Days</p><h2>Store Performance</h2></div><button class="ops-button secondary" id="ops-analytics-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-analytics-metrics"></div><div class="ops-panel"><div class="ops-panel-head"><div><h2>Top Products</h2></div></div><div class="ops-bars" id="ops-analytics-products"></div></div>
      `)}
      ${view("settings","Administration","Settings",`
        <div class="ops-panel">
          <div class="ops-panel-head"><div><h2>Shopify Publishing</h2><p>Choose the Headless channel for the Nimba storefront. This choice is saved in this browser.</p></div></div>
          <div class="ops-form-grid"><label class="ops-field">Sales channel<select id="ops-publication"><option value="">Automatic</option></select></label></div>
          <button class="ops-button" id="ops-publication-save" type="button">Save publishing channel</button>
          <p class="admin-message" id="ops-publication-message" role="status"></p>
        </div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Admin Preferences</h2><p>Stored only in this browser.</p></div></div><div class="ops-form-grid"><label class="ops-field">Default Landing<select id="ops-setting-landing"><option value="dashboard">Dashboard</option><option value="orders">Orders</option><option value="fulfillment">Fulfillment</option><option value="products">Products</option><option value="inventory">Inventory</option></select></label><label class="ops-field">Low Stock Reference<input id="ops-setting-low-stock" type="number" min="0" max="100" value="5"></label></div><div style="margin-top:12px"><button class="ops-button" id="ops-settings-save">Save Preferences</button></div><p class="admin-message" id="ops-settings-message"></p></div>
      `)}
    `);
  }

  function view(id,kicker,title,body){return `<section class="admin-view" id="view-${id}" data-view-panel="${id}"><div class="admin-page-head"><div><p class="admin-kicker">${kicker}</p><h1>${title}</h1></div></div>${body}</section>`}

  function rebuildNav(nav){
    const wanted=[["dashboard","Dashboard"],["orders","Orders"],["fulfillment","Fulfillment"],["products","Products"],["editor","Add Product"],["bulk","Bulk Upload"],["shop-editor","Shop Editor"],["inventory","Inventory"],["customers","Customers"],["discounts","Discounts"],["draft-orders","Draft Orders"],["returns","Returns"],["abandoned","Abandoned"],["analytics","Analytics"],["settings","Settings"]];
    const existing={};
    nav.querySelectorAll("[data-view]").forEach(b=>existing[b.dataset.view]=b);
    nav.innerHTML="";
    wanted.forEach(([v,l])=>{const b=existing[v]||document.createElement("button");b.type="button";b.className="admin-nav-link"+(v==="dashboard"?" is-active":"");b.dataset.view=v;b.textContent=l;const icon=document.createElement("img");icon.src="assets/icons/"+({dashboard:"home",products:"shop",editor:"shop",bulk:"harvest","shop-editor":"shop",inventory:"harvest",customers:"contact",settings:"connection"}[v]||"connection")+".svg?v=2";icon.alt="";icon.className="admin-carved-icon";icon.setAttribute("aria-hidden","true");b.prepend(icon);nav.appendChild(b)});
  }

  function bindNav(nav){
    nav.querySelectorAll("[data-view]").forEach(b=>{
      b.onclick=()=>{
        nav.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("is-active",x===b));
        if(typeof switchView==="function") switchView(b.dataset.view);
        else document.querySelectorAll(".admin-view").forEach(x=>x.classList.toggle("is-active",x.dataset.viewPanel===b.dataset.view));
        if(b.dataset.view==="fulfillment") loadOrders().then(renderFulfillment).catch(showOpsError);
        if(b.dataset.view==="returns") loadOrders().then(renderReturns).catch(showOpsError);
        if(b.dataset.view==="settings") loadPublishing();
        if(b.dataset.view==="analytics") loadAnalytics().catch(showOpsError);
        if(b.dataset.view==="shop-editor" && typeof window.loadShopEditor==="function") window.loadShopEditor();
      };
    });
  }

  function bindControls(){
    $("ops-fulfillment-search")?.addEventListener("input",renderFulfillment);
    $("ops-fulfillment-filter")?.addEventListener("change",renderFulfillment);
    $("ops-fulfillment-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderFulfillment).catch(showOpsError));
    $("ops-returns-search")?.addEventListener("input",renderReturns);
    $("ops-returns-filter")?.addEventListener("change",renderReturns);
    $("ops-returns-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderReturns).catch(showOpsError));
    $("ops-analytics-refresh")?.addEventListener("click",()=>loadAnalytics(true).catch(showOpsError));
    $("ops-settings-save")?.addEventListener("click",saveSettings);
    $("ops-publication-save")?.addEventListener("click", savePublishing);
    loadSettings();
  }

  async function loadOrders(force=false){if(STATE.orders.length&&!force)return STATE.orders;const d=await apiJson("/api/admin-orders");STATE.orders=d.orders||[];return STATE.orders}

  function renderFulfillment(){
    const q=($("ops-fulfillment-search")?.value||"").toLowerCase(), f=$("ops-fulfillment-filter")?.value||"OPEN";
    const openAll=STATE.orders.filter(o=>String(o.displayFulfillmentStatus||"").toUpperCase()!=="FULFILLED");
    const rows=STATE.orders.filter(o=>{const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();const open=String(o.displayFulfillmentStatus||"").toUpperCase()!=="FULFILLED";return(!q||hay.includes(q))&&(f==="ALL"||open)});
    $("ops-fulfillment-metrics").innerHTML=metric("Needs Shipping",openAll.length)+metric("Units to Pack",openAll.reduce((s,o)=>s+qty(o),0))+metric("Queue Value",cash(openAll.reduce((s,o)=>s+total(o),0)))+metric("Oldest",openAll.length?dt([...openAll].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))[0].createdAt):"—");
    $("ops-fulfillment-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFulfillmentStatus||"—")}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-go-orders>View Orders</button></div></article>`).join(""):`<div class="ops-empty">No orders in this queue.</div>`;
    $("ops-fulfillment-list")?.querySelectorAll("[data-go-orders]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }
  function metric(a,b){return `<article class="ops-metric"><span>${esc(a)}</span><strong>${esc(b)}</strong></article>`}

  function renderReturns(){
    const q=($("ops-returns-search")?.value||"").toLowerCase(),f=$("ops-returns-filter")?.value||"ALL";
    const rows=STATE.orders.filter(o=>{const s=String(o.displayFinancialStatus||"").toUpperCase();const ok=s==="REFUNDED"||s==="PARTIALLY_REFUNDED";const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();return ok&&(!q||hay.includes(q))&&(f==="ALL"||s===f)});
    $("ops-returns-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFinancialStatus)}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-go-orders>View Order</button></div></article>`).join(""):`<div class="ops-empty">No refunded orders found in the loaded order history.</div>`;
    $("ops-returns-list")?.querySelectorAll("[data-go-orders]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }

  async function loadAnalytics(force=false){if(STATE.dashboard&&!force)return renderAnalytics();const [d]=await Promise.all([apiJson("/api/admin-dashboard?days=30"),loadOrders(force)]);STATE.dashboard=d;renderAnalytics()}
  function renderAnalytics(){const m=STATE.dashboard?.metrics||{};$("ops-analytics-metrics").innerHTML=metric("Revenue",cash(m.revenue||0))+metric("Orders",m.orders||0)+metric("Average Order",cash(m.averageOrder||0))+metric("Units Sold",m.unitsSold||0);const counts={};STATE.orders.forEach(o=>(o.lineItems?.nodes||[]).forEach(i=>counts[i.name]=(counts[i.name]||0)+Number(i.quantity||0)));const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8),max=rows[0]?.[1]||1;$("ops-analytics-products").innerHTML=rows.length?rows.map(([name,n])=>`<div class="ops-bar"><span>${esc(name)}</span><div class="ops-bar-track"><div class="ops-bar-fill" style="width:${Math.max(3,(n/max)*100)}%"></div></div><strong>${n} units</strong></div>`).join(""):`<div class="ops-empty">No order product data available.</div>`}

  async function loadPublishing(){
    const select = $("ops-publication");
    const save = $("ops-publication-save");
    select.disabled = true;
    save.disabled = true;
    msg("ops-publication-message", "Loading Shopify channels…");
    try {
      const {publications,configuredId} = await apiJson("/api/admin-publications");
      select.replaceChildren(new Option("Automatic", ""));
      for (const item of publications) {
        const label = [item.name,...item.apps.filter(name => name !== item.name)].join(" / ");
        select.add(new Option(`${label} (${item.id.split("/").pop()})`, item.id));
      }
      const saved = configuredId || selectedPublication();
      select.value = publications.some(item => item.id === saved) ? saved : "";
      select.disabled = Boolean(configuredId);
      save.disabled = Boolean(configuredId);
      msg("ops-publication-message", configuredId ? "Publishing is configured in Vercel." : "");
    } catch (error) {
      msg("ops-publication-message", error.message);
    }
  }

  function savePublishing(){
    try {
      const value = $("ops-publication").value;
      if (value) localStorage.setItem(publicationPreference, value);
      else localStorage.removeItem(publicationPreference);
      msg("ops-publication-message", "Publishing channel saved. Retry the product upload or publish action.");
    } catch {
      msg("ops-publication-message", "This browser could not save the publishing channel.");
    }
  }

  function loadSettings(){try{const s=JSON.parse(localStorage.getItem("nimba_admin_ops_settings")||"{}");if($("ops-setting-landing"))$("ops-setting-landing").value=s.landing||"dashboard";if($("ops-setting-low-stock"))$("ops-setting-low-stock").value=s.lowStock??5}catch{}}
  function saveSettings(){const s={landing:$("ops-setting-landing")?.value||"dashboard",lowStock:Number($("ops-setting-low-stock")?.value||5)};localStorage.setItem("nimba_admin_ops_settings",JSON.stringify(s));msg("ops-settings-message","Preferences saved on this device.")}
  function msg(id,t){if($(id))$(id).textContent=t}
  function showOpsError(e){console.error(e);alert(e?.message||"Unable to load this admin section.")}
})();
