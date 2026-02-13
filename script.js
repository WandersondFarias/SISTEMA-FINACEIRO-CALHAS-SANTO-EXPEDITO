let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];
let grafico = null;
let filtroInicio = null;
let filtroFim = null;

/* =========================
   SALVAR NO LOCALSTORAGE
========================= */
function salvarDados() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
}

/* =========================
   ADICIONAR LANÇAMENTO
========================= */
function adicionarLancamento() {
  const data = document.getElementById("data").value;
  const descricao = document.getElementById("descricao").value.trim();
  const categoria = document.getElementById("categoria").value;
  const tipo = document.getElementById("tipo").value;
  const valor = parseFloat(document.getElementById("valor").value);

  if (!data || !descricao || isNaN(valor) || valor <= 0) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  lancamentos.push({
    id: Date.now(),
    data,
    descricao,
    categoria,
    tipo,
    valor
  });

  salvarDados();
  limparFormulario();
  atualizarTela();
}

function limparFormulario() {
  document.getElementById("data").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("valor").value = "";
}

/* =========================
   FILTRO POR PERÍODO
========================= */
function filtrarPorPeriodo() {
  filtroInicio = document.getElementById("dataInicio").value || null;
  filtroFim = document.getElementById("dataFim").value || null;
  atualizarTela();
}

/* =========================
   ATUALIZAR TELA
========================= */
function atualizarTela() {
  const lista = document.getElementById("listaLancamentos");
  const totalEntradasEl = document.getElementById("totalEntradas");
  const totalSaidasEl = document.getElementById("totalSaidas");
  const saldoTotalEl = document.getElementById("saldoTotal");

  lista.innerHTML = "";

  let totalEntradas = 0;
  let totalSaidas = 0;

  lancamentos.forEach(item => {
    if (filtroInicio && item.data < filtroInicio) return;
    if (filtroFim && item.data > filtroFim) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.data}</td>
      <td>${item.descricao}</td>
      <td>${item.categoria}</td>
      <td>${item.tipo === "entrada" ? "Entrada" : "Saída"}</td>
      <td>
        <span id="valor-${item.id}">R$ ${item.valor.toFixed(2)}</span>
      </td>
      <td>
        <button class="btn-editar" onclick="editarValor(${item.id})">✏️</button>
        <button class="btn-excluir" onclick="excluirLancamento(${item.id})">🗑️</button>
      </td>
    `;
    lista.appendChild(tr);

    if (item.tipo === "entrada") totalEntradas += item.valor;
    else totalSaidas += item.valor;
  });

  const saldo = totalEntradas - totalSaidas;

  totalEntradasEl.innerText = `R$ ${totalEntradas.toFixed(2)}`;
  totalSaidasEl.innerText = `R$ ${totalSaidas.toFixed(2)}`;
  saldoTotalEl.innerText = `R$ ${saldo.toFixed(2)}`;

  atualizarGrafico(totalEntradas, totalSaidas);
}

/* =========================
   EDITAR VALOR
========================= */
function editarValor(id) {
  const span = document.getElementById(`valor-${id}`);
  const item = lancamentos.find(l => l.id === id);

  span.innerHTML = `
    <input type="number" id="input-${id}" value="${item.valor}" style="width:80px">
    <button class="btn-salvar" onclick="salvarValor(${id})">💾</button>
  `;
}

function salvarValor(id) {
  const novoValor = parseFloat(document.getElementById(`input-${id}`).value);
  if (isNaN(novoValor) || novoValor <= 0) {
    alert("Valor inválido");
    return;
  }

  const item = lancamentos.find(l => l.id === id);
  item.valor = novoValor;

  salvarDados();
  atualizarTela();
}

/* =========================
   EXCLUIR
========================= */
function excluirLancamento(id) {
  if (!confirm("Deseja excluir este lançamento?")) return;

  lancamentos = lancamentos.filter(l => l.id !== id);
  salvarDados();
  atualizarTela();
}

/* =========================
   GRÁFICO
========================= */
function atualizarGrafico(totalEntradas, totalSaidas) {
  const ctx = document.getElementById("graficoCaixa").getContext("2d");
  const tipoDashboard = document.getElementById("tipoDashboard").value;

  if (grafico) grafico.destroy();

  // 🔹 1. ENTRADAS X SAÍDAS
  if (tipoDashboard === "movimentacao") {
    grafico = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Entradas", "Saídas"],
        datasets: [{
          label: "R$",
          data: [totalEntradas, totalSaidas],
          borderWidth: 2
        }]
      }
    });
  }

  // 🔹 2. ENTRADAS POR CATEGORIA
  if (tipoDashboard === "categoria") {
    const dados = {};
    lancamentos.forEach(l => {
      if (l.tipo === "entrada") {
        dados[l.categoria] = (dados[l.categoria] || 0) + l.valor;
      }
    });

    grafico = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(dados),
        datasets: [{ data: Object.values(dados) }]
      }
    });
  }

  // 🔹 3. SALDO ACUMULADO
  if (tipoDashboard === "saldo") {
    let saldo = 0;
    const datas = [];
    const valores = [];

    [...lancamentos]
      .sort((a, b) => a.data.localeCompare(b.data))
      .forEach(l => {
        saldo += l.tipo === "entrada" ? l.valor : -l.valor;
        datas.push(l.data);
        valores.push(saldo);
      });

    grafico = new Chart(ctx, {
      type: "line",
      data: {
        labels: datas,
        datasets: [{
          label: "Saldo (R$)",
          data: valores,
          fill: true,
          tension: 0.4
        }]
      }
    });
  }

  // 🔹 4. POR MÊS (ENTRADAS X SAÍDAS)
  if (tipoDashboard === "mensal") {
    const meses = {};

    lancamentos.forEach(l => {
      const mes = l.data.slice(0, 7); // yyyy-mm
      if (!meses[mes]) meses[mes] = { entrada: 0, saida: 0 };
      meses[mes][l.tipo] += l.valor;
    });

    grafico = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(meses),
        datasets: [
          { label: "Entradas", data: Object.values(meses).map(m => m.entrada) },
          { label: "Saídas", data: Object.values(meses).map(m => m.saida) }
        ]
      }
    });
  }

  // 🔹 5. RANKING DE GASTOS
  if (tipoDashboard === "ranking") {
    const gastos = {};

    lancamentos.forEach(l => {
      if (l.tipo === "saida") {
        gastos[l.categoria] = (gastos[l.categoria] || 0) + l.valor;
      }
    });

    grafico = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(gastos),
        datasets: [{
          label: "Gastos (R$)",
          data: Object.values(gastos)
        }]
      },
      options: {
        indexAxis: "y"
      }
    });
  }
}


/* =========================
   MODO ESCURO
========================= */
function alternarModo() {
  const body = document.body;
  const botao = document.getElementById("btnModo");

  body.classList.toggle("dark");
  botao.textContent = body.classList.contains("dark") ? "☀️" : "🌙";
}

/* =========================
   EXPORTAÇÕES
========================= */
function exportarExcel() {
  let csv = "Data,Descrição,Categoria,Tipo,Valor\n";
  lancamentos.forEach(l => {
    csv += `${l.data},${l.descricao},${l.categoria},${l.tipo},${l.valor}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "financeiro_calhas_santo_expedito.csv";
  link.click();
}

function exportarPDF() {
  window.print();
}

/* =========================
   INICIALIZA
========================= */
document.addEventListener("DOMContentLoaded", atualizarTela);



/* =========================
   LOGIN SIMPLES
========================= */
function fazerLogin() {
  const user = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPass").value;
  const erro = document.getElementById("loginErro");

  if (user === "admin" && pass === "123") {
    document.body.classList.add("logado");
  } else {
    erro.textContent = "Usuário ou senha inválidos";
  }
}
