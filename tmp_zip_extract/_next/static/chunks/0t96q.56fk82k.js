(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,54338,e=>{"use strict";var t=e.i(71645),o=e.i(7471),i=e.i(18566);e.s(["useAuth",0,function(){let[e,a]=(0,t.useState)(null),[n,s]=(0,t.useState)(null),[r,l]=(0,t.useState)(!0),d=(0,o.createClient)(),c=(0,i.useRouter)();return(0,t.useEffect)(()=>{(async()=>{try{let e=new Promise((e,t)=>setTimeout(()=>t(Error("TIMEOUT")),4e3)),t=await Promise.race([d.auth.getUser(),e]);if(t.error)throw t.error;let o=t.data?.user;a(o),o?s(o.user_metadata?.role||"RECEPTIONIST"):window.location.pathname.includes("/login")||(window.location.href="/login")}catch(e){console.error("Auth Error/Timeout:",e),a(null),window.location.pathname.includes("/login")||(window.location.href="/login")}finally{l(!1)}})();let{data:{subscription:e}}=d.auth.onAuthStateChange((e,t)=>{a(t?.user??null),t?.user?s(t.user.user_metadata?.role||"RECEPTIONIST"):s(null)});return()=>e.unsubscribe()},[d.auth]),{user:e,role:n,loading:r,signOut:async()=>{await d.auth.signOut(),c.push("/login")}}}])},81132,e=>{"use strict";var t=e.i(43476),o=e.i(54338);e.s(["RoleGuard",0,function({children:e,allowedRoles:i,fallback:a=null}){let{role:n,loading:s}=(0,o.useAuth)();return s?null:n&&i.includes(n)?(0,t.jsx)(t.Fragment,{children:e}):(0,t.jsx)(t.Fragment,{children:a})}])},52696,e=>{"use strict";var t=e.i(43476),o=e.i(71645),i=e.i(7471),a=e.i(51514),n=e.i(54338);let s={CONSULTA:"#1E88E5",LABORATORIO:"#4CAF50",IMAGENES:"#9C27B0",FARMACIA:"#FF9800",INTERNACION:"#F44336",EMERGENCIA:"#FF5252",PROCEDIMIENTO:"#00BCD4",OTRO:"#607D8B"},r={PENDIENTE:"#FF9800",PAGADO:"#4CAF50",ANULADO:"#F44336",PARCIAL:"#00BCD4"},l=["TODOS","CONSULTA","LABORATORIO","IMAGENES","FARMACIA","INTERNACION","EMERGENCIA","PROCEDIMIENTO"],d=["TODOS","PENDIENTE","PAGADO","ANULADO","PARCIAL"],c=["EFECTIVO","TARJETA","TRANSFERENCIA","SEGURO","EXENTO"];e.s(["default",0,function(){let{user:e}=(0,n.useAuth)(),p=(0,i.createClient)(),[x,u]=(0,o.useState)([]),[g,m]=(0,o.useState)(!0),[h,b]=(0,o.useState)("TODOS"),[f,y]=(0,o.useState)("TODOS"),[v,j]=(0,o.useState)(""),[A,S]=(0,o.useState)(""),[C,E]=(0,o.useState)(!1),[O,w]=(0,o.useState)([]),[T,_]=(0,o.useState)(!1),[I,N]=(0,o.useState)({patient_id:"",tipo:"CONSULTA",descripcion:"",monto_subtotal:"",descuento:"0",metodo_pago:"EFECTIVO",notas:"",seguro_provider:"",seguro_cobertura:"0"}),z=(0,o.useCallback)(async()=>{m(!0);let e=p.from("recibos").select("*, patients(first_name,last_name,mrn), user_profiles!emitido_por(full_name)").order("created_at",{ascending:!1});"TODOS"!==h&&(e=e.eq("tipo",h)),"TODOS"!==f&&(e=e.eq("estado",f)),v&&(e=e.gte("created_at",v).lte("created_at",v+"T23:59:59"));let{data:t}=await e.limit(100);u(t||[]),m(!1)},[h,f,v]);(0,o.useEffect)(()=>{z()},[z]),(0,o.useEffect)(()=>{p.from("patients").select("id,first_name,last_name,mrn").order("last_name").limit(200).then(({data:e})=>w(e||[]))},[]);let R={total:x.reduce((e,t)=>"PAGADO"===t.estado?e+t.monto_total:e,0),pendiente:x.filter(e=>"PENDIENTE"===e.estado).reduce((e,t)=>e+t.monto_total,0),count:x.length,anulados:x.filter(e=>"ANULADO"===e.estado).length},k=x.filter(e=>{if(!A)return!0;let t=A.toLowerCase();return e.receipt_number?.toLowerCase().includes(t)||e.patients?.first_name?.toLowerCase().includes(t)||e.patients?.last_name?.toLowerCase().includes(t)||e.patients?.mrn?.toLowerCase().includes(t)}),F=async()=>{if(!I.patient_id||!I.monto_subtotal)return;_(!0);let t=parseFloat(I.monto_subtotal)||0,o=parseFloat(I.descuento)||0,i=parseFloat(I.seguro_cobertura)||0,a=Math.max(0,t-o-i);await p.from("recibos").insert({patient_id:I.patient_id,tipo:I.tipo,descripcion:I.descripcion,monto_subtotal:t,descuento:o,monto_total:a,metodo_pago:I.metodo_pago,notas:I.notas,seguro_provider:I.seguro_provider||null,seguro_cobertura:i,emitido_por:e?.id}),_(!1),E(!1),N({patient_id:"",tipo:"CONSULTA",descripcion:"",monto_subtotal:"",descuento:"0",metodo_pago:"EFECTIVO",notas:"",seguro_provider:"",seguro_cobertura:"0"}),z()},D=async e=>{await p.from("recibos").update({estado:"PAGADO",pagado_en:new Date().toISOString()}).eq("id",e),z()},B=async t=>{confirm("¿Anular este recibo?")&&(await p.from("recibos").update({estado:"ANULADO",anulado_en:new Date().toISOString(),anulado_por:e?.id}).eq("id",t),z())},P={background:"#0B1628",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"white",padding:"8px 12px",fontSize:13,width:"100%",outline:"none",fontFamily:"Inter, sans-serif"};return(0,t.jsxs)("div",{className:"animate-fade-in",style:{maxWidth:1400,margin:"0 auto"},children:[(0,t.jsxs)("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24},children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("h1",{style:{fontSize:22,fontWeight:800,color:"var(--text-primary)",marginBottom:4,display:"flex",alignItems:"center",gap:10},children:[(0,t.jsx)(a.Icon,{name:"Receipt",size:22,style:{color:"#FF9800"}}),"Recibos & Caja"]}),(0,t.jsx)("p",{style:{fontSize:13,color:"var(--text-muted)"},children:"Gestión de cobros, recibos de pago y arqueo de caja diario"})]}),(0,t.jsxs)("button",{onClick:()=>E(!0),className:"btn-primary",style:{gap:8,flexShrink:0},children:[(0,t.jsx)(a.Icon,{name:"Plus",size:16})," Nuevo Recibo"]})]}),(0,t.jsx)("div",{style:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:16,marginBottom:24},children:[{label:"Recaudado Hoy",value:`Bs. ${R.total.toFixed(2)}`,icon:"TrendingUp",color:"#4CAF50"},{label:"Por Cobrar",value:`Bs. ${R.pendiente.toFixed(2)}`,icon:"Clock",color:"#FF9800"},{label:"Recibos Emitidos",value:R.count,icon:"FileText",color:"#1E88E5"},{label:"Anulados",value:R.anulados,icon:"XCircle",color:"#F44336"}].map(e=>(0,t.jsxs)("div",{className:"glass-card",style:{padding:"18px 20px",display:"flex",alignItems:"center",gap:16},children:[(0,t.jsx)("div",{style:{width:44,height:44,borderRadius:12,background:`${e.color}18`,border:`1px solid ${e.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:(0,t.jsx)(a.Icon,{name:e.icon,size:20,style:{color:e.color}})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{style:{fontSize:20,fontWeight:800,color:"var(--text-primary)"},children:e.value}),(0,t.jsx)("div",{style:{fontSize:11,color:"var(--text-muted)"},children:e.label})]})]},e.label))}),(0,t.jsxs)("div",{className:"glass-card",style:{padding:"14px 18px",marginBottom:20,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[(0,t.jsxs)("div",{style:{position:"relative",flex:1,minWidth:200},children:[(0,t.jsx)(a.Icon,{name:"Search",size:14,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),(0,t.jsx)("input",{value:A,onChange:e=>S(e.target.value),placeholder:"Buscar por N° recibo o paciente...",style:{...P,paddingLeft:32}})]}),(0,t.jsx)("select",{value:h,onChange:e=>b(e.target.value),style:{...P,width:"auto"},children:l.map(e=>(0,t.jsx)("option",{value:e,children:"TODOS"===e?"Todos los tipos":e},e))}),(0,t.jsx)("select",{value:f,onChange:e=>y(e.target.value),style:{...P,width:"auto"},children:d.map(e=>(0,t.jsx)("option",{value:e,children:"TODOS"===e?"Todos los estados":e},e))}),(0,t.jsx)("input",{type:"date",value:v,onChange:e=>j(e.target.value),style:{...P,width:"auto"}}),("TODOS"!==h||"TODOS"!==f||v||A)&&(0,t.jsxs)("button",{onClick:()=>{b("TODOS"),y("TODOS"),j(""),S("")},className:"btn-ghost",style:{gap:6,fontSize:12},children:[(0,t.jsx)(a.Icon,{name:"X",size:12})," Limpiar"]})]}),(0,t.jsx)("div",{className:"glass-card",style:{overflow:"hidden"},children:(0,t.jsx)("div",{style:{overflowX:"auto"},children:(0,t.jsxs)("table",{style:{width:"100%",borderCollapse:"collapse"},children:[(0,t.jsx)("thead",{children:(0,t.jsx)("tr",{style:{borderBottom:"1px solid var(--border-secondary)"},children:["N° Recibo","Paciente","Tipo","Descripción","Método","Total (Bs.)","Estado","Fecha","Acciones"].map(e=>(0,t.jsx)("th",{style:{padding:"12px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",letterSpacing:"0.06em",whiteSpace:"nowrap"},children:e},e))})}),(0,t.jsx)("tbody",{children:g?(0,t.jsx)("tr",{children:(0,t.jsx)("td",{colSpan:9,style:{padding:40,textAlign:"center",color:"var(--text-muted)"},children:(0,t.jsx)(a.Icon,{name:"Loader2",className:"animate-spin",size:20})})}):0===k.length?(0,t.jsx)("tr",{children:(0,t.jsxs)("td",{colSpan:9,style:{padding:48,textAlign:"center",color:"var(--text-muted)",fontSize:13},children:[(0,t.jsx)(a.Icon,{name:"Receipt",size:32,style:{opacity:.3,display:"block",margin:"0 auto 8px"}}),"No hay recibos registrados"]})}):k.map(e=>(0,t.jsxs)("tr",{style:{borderBottom:"1px solid rgba(255,255,255,0.04)",transition:"background 0.1s"},onMouseEnter:e=>e.currentTarget.style.background="rgba(255,255,255,0.02)",onMouseLeave:e=>e.currentTarget.style.background="transparent",children:[(0,t.jsx)("td",{style:{padding:"12px 14px",fontSize:12,fontFamily:"monospace",color:"#1E88E5",whiteSpace:"nowrap"},children:e.receipt_number}),(0,t.jsxs)("td",{style:{padding:"12px 14px",fontSize:12},children:[(0,t.jsxs)("div",{style:{fontWeight:600,color:"var(--text-primary)"},children:[e.patients?.first_name," ",e.patients?.last_name]}),(0,t.jsx)("div",{style:{fontSize:10,color:"var(--text-muted)"},children:e.patients?.mrn})]}),(0,t.jsx)("td",{style:{padding:"12px 14px"},children:(0,t.jsx)("span",{style:{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:5,background:`${s[e.tipo]||"#607D8B"}18`,color:s[e.tipo]||"#607D8B",border:`1px solid ${s[e.tipo]||"#607D8B"}30`},children:e.tipo})}),(0,t.jsx)("td",{style:{padding:"12px 14px",fontSize:12,color:"var(--text-secondary)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.descripcion||"—"}),(0,t.jsx)("td",{style:{padding:"12px 14px",fontSize:11,color:"var(--text-secondary)"},children:e.metodo_pago}),(0,t.jsxs)("td",{style:{padding:"12px 14px",fontSize:14,fontWeight:700,color:"#4CAF50"},children:["Bs. ",e.monto_total.toFixed(2)]}),(0,t.jsx)("td",{style:{padding:"12px 14px"},children:(0,t.jsx)("span",{style:{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:5,background:`${r[e.estado]}18`,color:r[e.estado],border:`1px solid ${r[e.estado]}30`},children:e.estado})}),(0,t.jsx)("td",{style:{padding:"12px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"},children:new Date(e.created_at).toLocaleDateString("es-BO")}),(0,t.jsx)("td",{style:{padding:"12px 14px"},children:(0,t.jsxs)("div",{style:{display:"flex",gap:4},children:[(0,t.jsx)("button",{onClick:()=>{let t;(t=window.open("","_blank","width=800,height=900"))&&(t.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura / Recibo ${e.receipt_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; }
          .container { max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-box { width: 48px; height: 48px; background: #1E88E5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 24px; }
          h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
          .hospital-info { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5; }
          .receipt-title { text-align: right; }
          .receipt-title h2 { margin: 0; font-size: 28px; font-weight: 800; color: #1E88E5; letter-spacing: 0.05em; text-transform: uppercase; }
          .receipt-title p { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #475569; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; background: #f8fafc; padding: 20px; border-radius: 8px; }
          .info-block span { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
          .info-block strong { display: block; font-size: 15px; color: #1e293b; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; }
          td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .totals-box { width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
          .total-final { display: flex; justify-content: space-between; padding: 16px 0; margin-top: 8px; border-top: 2px solid #cbd5e1; font-size: 18px; font-weight: 800; color: #0f172a; }
          .total-final .amount { color: #1E88E5; font-size: 24px; }
          
          .footer { margin-top: 60px; padding-top: 24px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; margin-top: 8px; }
          .status-PAGADO { background: #dcfce7; color: #166534; }
          .status-PENDIENTE { background: #fef3c7; color: #b45309; }
          .status-ANULADO { background: #fee2e2; color: #991b1b; }
          
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-area">
              <div class="logo-box">H</div>
              <div>
                <h1>HOSPITAL SAN JUAN DE DIOS</h1>
                <div class="hospital-info">Av. Principal 123, Ciudad de Salud<br>Tel: +1 234 567 8900 | Nit: 123456789</div>
              </div>
            </div>
            <div class="receipt-title">
              <h2>FACTURA</h2>
              <p>N\xb0 ${e.receipt_number}</p>
              <div class="status-badge status-${e.estado}">${e.estado}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-block">
              <span>Paciente</span>
              <strong>${e.patients?.first_name} ${e.patients?.last_name}</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">MRN: ${e.patients?.mrn||"—"}</div>
            </div>
            <div class="info-block" style="text-align: right;">
              <span>Fecha de Emisi\xf3n</span>
              <strong>${new Date(e.created_at).toLocaleString("es-BO")}</strong>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Atendido por: ${e.user_profiles?.full_name||"—"}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Servicio / Concepto</th>
                <th class="text-center">Tipo</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${e.descripcion||"Servicio Médico"}</strong></td>
                <td class="text-center"><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${e.tipo}</span></td>
                <td class="text-right" style="font-weight: 600;">Bs. ${e.monto_total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="totals-box">
            <div class="total-row">
              <span>M\xe9todo de pago:</span>
              <strong>${e.metodo_pago}</strong>
            </div>
            <div class="total-final">
              <span>TOTAL A PAGAR</span>
              <span class="amount">Bs. ${e.monto_total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <strong>SISTEMA INTEGRADO FARO</strong><br>
            Gracias por confiar en nuestros servicios.<br>
            Este documento es un comprobante v\xe1lido generado electr\xf3nicamente.
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
      </html>
    `),t.document.close())},title:"Imprimir",style:{background:"rgba(30,136,229,0.1)",border:"1px solid rgba(30,136,229,0.2)",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:"#1E88E5"},children:(0,t.jsx)(a.Icon,{name:"Printer",size:13})}),"PENDIENTE"===e.estado&&(0,t.jsx)("button",{onClick:()=>D(e.id),title:"Marcar Pagado",style:{background:"rgba(76,175,80,0.1)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:"#4CAF50"},children:(0,t.jsx)(a.Icon,{name:"CheckCircle",size:13})}),"ANULADO"!==e.estado&&(0,t.jsx)("button",{onClick:()=>B(e.id),title:"Anular",style:{background:"rgba(244,67,54,0.1)",border:"1px solid rgba(244,67,54,0.2)",borderRadius:6,padding:"5px 8px",cursor:"pointer",color:"#F44336"},children:(0,t.jsx)(a.Icon,{name:"X",size:13})})]})})]},e.id))})]})})}),C&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{onClick:()=>E(!1),style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,backdropFilter:"blur(4px)"}}),(0,t.jsxs)("div",{style:{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"100%",maxWidth:540,zIndex:201,background:"#0B1628",border:"1px solid rgba(255,153,0,0.3)",borderRadius:16,padding:28,boxShadow:"0 32px 80px rgba(0,0,0,0.6)"},children:[(0,t.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22},children:[(0,t.jsxs)("h2",{style:{fontSize:17,fontWeight:800,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:8},children:[(0,t.jsx)(a.Icon,{name:"Receipt",size:18,style:{color:"#FF9800"}})," Emitir Nuevo Recibo"]}),(0,t.jsx)("button",{onClick:()=>E(!1),style:{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)"},children:(0,t.jsx)(a.Icon,{name:"X",size:18})})]}),(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",gap:14},children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Paciente *"}),(0,t.jsxs)("select",{value:I.patient_id,onChange:e=>N(t=>({...t,patient_id:e.target.value})),style:P,children:[(0,t.jsx)("option",{value:"",children:"Seleccionar paciente..."}),O.map(e=>(0,t.jsxs)("option",{value:e.id,children:[e.first_name," ",e.last_name," — ",e.mrn]},e.id))]})]}),(0,t.jsxs)("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Tipo de Servicio *"}),(0,t.jsx)("select",{value:I.tipo,onChange:e=>N(t=>({...t,tipo:e.target.value})),style:P,children:["CONSULTA","LABORATORIO","IMAGENES","FARMACIA","INTERNACION","EMERGENCIA","PROCEDIMIENTO","OTRO"].map(e=>(0,t.jsx)("option",{children:e},e))})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Método de Pago *"}),(0,t.jsx)("select",{value:I.metodo_pago,onChange:e=>N(t=>({...t,metodo_pago:e.target.value})),style:P,children:c.map(e=>(0,t.jsx)("option",{children:e},e))})]})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Descripción / Concepto"}),(0,t.jsx)("input",{value:I.descripcion,onChange:e=>N(t=>({...t,descripcion:e.target.value})),placeholder:"Ej: Consulta médica — Cardiología",style:P})]}),(0,t.jsxs)("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12},children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Subtotal (Bs.) *"}),(0,t.jsx)("input",{type:"number",min:"0",step:"0.01",value:I.monto_subtotal,onChange:e=>N(t=>({...t,monto_subtotal:e.target.value})),placeholder:"0.00",style:P})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Descuento (Bs.)"}),(0,t.jsx)("input",{type:"number",min:"0",step:"0.01",value:I.descuento,onChange:e=>N(t=>({...t,descuento:e.target.value})),style:P})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Cob. Seguro (Bs.)"}),(0,t.jsx)("input",{type:"number",min:"0",step:"0.01",value:I.seguro_cobertura,onChange:e=>N(t=>({...t,seguro_cobertura:e.target.value})),style:P})]})]}),(0,t.jsxs)("div",{style:{background:"rgba(76,175,80,0.08)",border:"1px solid rgba(76,175,80,0.2)",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,t.jsx)("span",{style:{fontSize:13,color:"var(--text-muted)",fontWeight:600},children:"TOTAL A PAGAR"}),(0,t.jsxs)("span",{style:{fontSize:22,fontWeight:800,color:"#4CAF50"},children:["Bs. ",Math.max(0,(parseFloat(I.monto_subtotal)||0)-(parseFloat(I.descuento)||0)-(parseFloat(I.seguro_cobertura)||0)).toFixed(2)]})]}),(0,t.jsxs)("div",{children:[(0,t.jsx)("label",{style:{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6,display:"block"},children:"Notas adicionales"}),(0,t.jsx)("textarea",{value:I.notas,onChange:e=>N(t=>({...t,notas:e.target.value})),rows:2,style:{...P,resize:"none"}})]}),(0,t.jsxs)("div",{style:{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4},children:[(0,t.jsx)("button",{onClick:()=>E(!1),className:"btn-ghost",children:"Cancelar"}),(0,t.jsxs)("button",{onClick:F,disabled:T||!I.patient_id||!I.monto_subtotal,className:"btn-primary",style:{gap:8},children:[T?(0,t.jsx)(a.Icon,{name:"Loader2",className:"animate-spin",size:14}):(0,t.jsx)(a.Icon,{name:"Save",size:14}),T?"Guardando...":"Emitir Recibo"]})]})]})]})]})]})}])}]);