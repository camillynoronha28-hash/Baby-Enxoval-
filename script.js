const categorias = [
  "Roupinhas",
  "Quarto",
  "Banho",
  "Higiene",
  "Alimentação",
  "Fraldas",
  "Acessórios",
  "Passeio",
  "Maternidade",
  "Mamãe",
  "Outros"
];

const CHAVE = "meuEnxovalDadosV1";

let dados = carregarDados();
let filtroAtual = "todos";
let itemEditando = null;

function carregarDados() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo
      ? JSON.parse(salvo)
      : { itens: [], orcamento: 0 };
  } catch {
    return { itens: [], orcamento: 0 };
  }
}

function salvarDados() {
  localStorage.setItem(CHAVE, JSON.stringify(dados));
}

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function elemento(id) {
  return document.getElementById(id);
}

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[caractere]);
}

function abrirPagina(nome) {
  document.querySelectorAll(".pagina").forEach(pagina => {
    pagina.classList.remove("ativa");
  });

  document.querySelectorAll(".menu-btn").forEach(botao => {
    botao.classList.remove("ativo");
  });

  elemento("pagina-" + nome).classList.add("ativa");

  const botao = document.querySelector(
    `.menu-btn[data-pagina="${nome}"]`
  );

  if (botao) botao.classList.add("ativo");

  atualizarTudo();
}

document.querySelectorAll(".menu-btn").forEach(botao => {
  botao.addEventListener("click", () => {
    abrirPagina(botao.dataset.pagina);
  });
});

document.querySelectorAll("[data-ir]").forEach(botao => {
  botao.addEventListener("click", () => {
    abrirPagina(botao.dataset.ir);
  });
});

function abrirModal(id = null) {
  itemEditando = id;

  elemento("form-item").reset();

  if (id !== null) {
    const item = dados.itens.find(item => item.id === id);

    if (!item) return;

    elemento("titulo-modal").textContent = "Editar item";
    elemento("nome-item").value = item.nome;
    elemento("categoria-item").value = item.categoria;
    elemento("quantidade-item").value = item.quantidade;
    elemento("tenho-item").value = item.tenho;
    elemento("preco-item").value = item.preco || "";
    elemento("loja-item").value = item.loja || "";
    elemento("link-item").value = item.link || "";
    elemento("observacao-item").value = item.observacao || "";
  } else {
    elemento("titulo-modal").textContent = "Adicionar item";
    elemento("quantidade-item").value = 1;
    elemento("tenho-item").value = 0;
  }

  elemento("modal-item").showModal();
}

elemento("adicionar-item").addEventListener("click", () => {
  abrirModal();
});

elemento("atalho-adicionar").addEventListener("click", () => {
  abrirModal();
});

elemento("cancelar-modal").addEventListener("click", () => {
  elemento("modal-item").close();
});

elemento("form-item").addEventListener("submit", evento => {
  evento.preventDefault();

  const nome = elemento("nome-item").value.trim();
  const categoria = elemento("categoria-item").value;

  if (!nome || !categoria) {
    alert("Preencha o nome e a categoria do item.");
    return;
  }

  const quantidade = Math.max(
    1,
    Math.floor(Number(elemento("quantidade-item").value) || 1)
  );

  const tenho = Math.min(
    quantidade,
    Math.max(
      0,
      Math.floor(Number(elemento("tenho-item").value) || 0)
    )
  );

  const item = {
    id: itemEditando ?? Date.now(),
    nome,
    categoria,
    quantidade,
    tenho,
    preco: Math.max(0, Number(elemento("preco-item").value) || 0),
    loja: elemento("loja-item").value,
    link: elemento("link-item").value.trim(),
    observacao: elemento("observacao-item").value.trim()
  };

  if (itemEditando !== null) {
    const indice = dados.itens.findIndex(
      existente => existente.id === itemEditando
    );

    if (indice !== -1) {
      dados.itens[indice] = item;
    }
  } else {
    dados.itens.push(item);
  }

  salvarDados();
  elemento("modal-item").close();
  atualizarTudo();
});

function excluirItem(id) {
  if (!confirm("Deseja realmente excluir este item?")) return;

  dados.itens = dados.itens.filter(item => item.id !== id);

  salvarDados();
  atualizarTudo();
}

function atualizarQuantidade(id, valor) {
  const item = dados.itens.find(item => item.id === id);

  if (!item) return;

  item.tenho = Math.min(
    item.quantidade,
    Math.max(0, Math.floor(Number(valor) || 0))
  );

  salvarDados();
  atualizarTudo();
}

function filtrarItens() {
  const busca = elemento("busca").value.toLowerCase().trim();

  return dados.itens.filter(item => {
    const correspondeBusca =
      item.nome.toLowerCase().includes(busca) ||
      item.categoria.toLowerCase().includes(busca);

    const correspondeFiltro =
      filtroAtual === "todos" ||
      (filtroAtual === "pendentes" && item.tenho < item.quantidade) ||
      (filtroAtual === "tenho" && item.tenho >= item.quantidade);

    return correspondeBusca && correspondeFiltro;
  });
}

document.querySelectorAll(".filtro").forEach(botao => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filtro;

    document.querySelectorAll(".filtro").forEach(f => {
      f.classList.remove("selecionado");
    });

    botao.classList.add("selecionado");
    renderizarLista();
  });
});

elemento("busca").addEventListener("input", renderizarLista);

function renderizarLista() {
  const lista = elemento("lista-itens");
  const itens = filtrarItens();

  lista.innerHTML = "";

  elemento("lista-vazia").style.display =
    itens.length ? "none" : "block";

  itens.forEach(item => {
    const faltam = Math.max(0, item.quantidade - item.tenho);

    const card = document.createElement("article");
    card.className = "item-card";

    card.innerHTML = `
      <h3>${escapar(item.nome)}</h3>
      <p>Categoria: ${escapar(item.categoria)}</p>
      <p>Quantidade necessária: ${item.quantidade}</p>
      <p>Faltam: ${faltam}</p>
      <p>Preço unitário: ${dinheiro(item.preco)}</p>
      ${item.loja ? `<p>Loja: ${escapar(item.loja)}</p>` : ""}
      ${item.observacao ? `<p>${escapar(item.observacao)}</p>` : ""}
      ${item.link ? `<p><a href="${escapar(item.link)}" target="_blank" rel="noopener noreferrer">Ver produto</a></p>` : ""}

      <label>
        Já tenho:
        <input
          type="number"
          min="0"
          max="${item.quantidade}"
          value="${item.tenho}"
          data-quantidade="${item.id}"
        >
      </label>

      <div class="acoes">
        <button data-editar="${item.id}">Editar</button>
        <button data-excluir="${item.id}">Excluir</button>
      </div>
    `;

    lista.appendChild(card);
  });

  lista.querySelectorAll("[data-editar]").forEach(botao => {
    botao.addEventListener("click", () => {
      abrirModal(Number(botao.dataset.editar));
    });
  });

  lista.querySelectorAll("[data-excluir]").forEach(botao => {
    botao.addEventListener("click", () => {
      excluirItem(Number(botao.dataset.excluir));
    });
  });

  lista.querySelectorAll("[data-quantidade]").forEach(input => {
    input.addEventListener("change", () => {
      atualizarQuantidade(
        Number(input.dataset.quantidade),
        input.value
      );
    });
  });
}

function renderizarInicio() {
  const total = dados.itens.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  const tenho = dados.itens.reduce(
    (soma, item) => soma + item.tenho,
    0
  );

  const faltam = Math.max(0, total - tenho);

  const porcentagem = total
    ? Math.round((tenho / total) * 100)
    : 0;

  elemento("total-itens").textContent = dados.itens.length;
  elemento("total-tenho").textContent = tenho;
  elemento("total-faltam").textContent = faltam;

  elemento("barra-progresso").style.width = porcentagem + "%";
  elemento("texto-progresso").textContent =
    porcentagem + "% concluído";

  elemento("orcamento").value = dados.orcamento || "";

  const valorFalta = dados.itens.reduce(
    (soma, item) =>
      soma + (item.quantidade - item.tenho) * item.preco,
    0
  );

  if (dados.orcamento > 0) {
    const diferenca = dados.orcamento - valorFalta;

    elemento("resumo-orcamento").textContent =
      diferenca >= 0
        ? `Ainda há ${dinheiro(diferenca)} disponíveis no orçamento.`
        : `O valor estimado ultrapassa o orçamento em ${dinheiro(Math.abs(diferenca))}.`;
  } else {
    elemento("resumo-orcamento").textContent =
      "Informe seu orçamento para acompanhar os gastos.";
  }
}

elemento("orcamento").addEventListener("change", evento => {
  dados.orcamento = Math.max(0, Number(evento.target.value) || 0);
  salvarDados();
  atualizarTudo();
});

function renderizarCompras() {
  const valorTotal = dados.itens.reduce(
    (soma, item) => soma + item.quantidade * item.preco,
    0
  );

  const valorTenho = dados.itens.reduce(
    (soma, item) => soma + item.tenho * item.preco,
    0
  );

  const valorFalta = Math.max(0, valorTotal - valorTenho);

  elemento("valor-total").textContent = dinheiro(valorTotal);
  elemento("valor-tenho").textContent = dinheiro(valorTenho);
  elemento("valor-falta").textContent = dinheiro(valorFalta);

  const lista = elemento("lista-compras");
  lista.innerHTML = "";

  const pendentes = dados.itens.filter(
    item => item.tenho < item.quantidade
  );

  if (!pendentes.length) {
    lista.innerHTML = "<p>Você não tem itens pendentes!</p>";
    return;
  }

  pendentes.forEach(item => {
    const faltam = item.quantidade - item.tenho;
    const total = faltam * item.preco;

    const div = document.createElement("div");
    div.className = "item-card";

    div.innerHTML = `
      <h3>${escapar(item.nome)}</h3>
      <p>Categoria: ${escapar(item.categoria)}</p>
      <p>Quantidade que falta: ${faltam}</p>
      <p>Valor estimado: ${dinheiro(total)}</p>
      ${item.loja ? `<p>Loja: ${escapar(item.loja)}</p>` : ""}
      ${item.link ? `<p><a href="${escapar(item.link)}" target="_blank" rel="noopener noreferrer">Ver produto</a></p>` : ""}
    `;

    lista.appendChild(div);
  });
}

function atualizarTudo() {
  renderizarInicio();
  renderizarLista();
  renderizarCompras();
}

atualizarTudo();
