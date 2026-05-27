# ⚡ DigitalCron Petrobras

> Plataforma de estudos premium para o concurso **Petrobras — Ênfase 6: Analista de Sistemas – Processos de Negócio**  
> Banca: **Cesgranrio** · Edital 2024/2025

---

## 🗂️ Estrutura do Projeto

```
digitalcron/
├── index.html              ← Landing page (entrada)
├── dashboard.html          ← Dashboard principal
├── simulados.html          ← Central de simulados
├── progresso.html          ← Progresso detalhado
├── banca.html              ← Entendendo a Cesgranrio
├── cronograma.html         ← (em breve)
├── configuracoes.html      ← (em breve)
│
├── assets/
│   ├── css/
│   │   ├── main.css        ← Design system completo (dark/light)
│   │   └── materia.css     ← Estilos das páginas de matéria
│   ├── js/
│   │   ├── app.js          ← Engine principal (Storage, Quiz, Pomodoro...)
│   │   └── layout.js       ← Injeção de sidebar/navbar
│   ├── data/               ← (reservado para JSONs futuros)
│   └── img/                ← (imagens e ícones)
│
├── components/
│   ├── sidebar.html        ← Sidebar reutilizável
│   └── navbar.html         ← Navbar reutilizável
│
└── materias/
    ├── portugues/
    │   └── index.html      ← Hub + 10 questões
    ├── ingles/
    │   └── index.html      ← Hub + 5 questões + teoria
    ├── arquitetura-dados/
    │   ├── index.html      ← Hub + 10 questões
    │   ├── sql.html
    │   ├── modelagem.html
    │   ├── nosql.html
    │   └── etl.html
    ├── projetos/           ← (em breve)
    ├── governanca-ti/      ← (em breve)
    ├── engenharia-software/← (em breve)
    ├── ux/                 ← (em breve)
    ├── bi/                 ← (em breve)
    ├── logica/             ← (em breve)
    └── seguranca/          ← (em breve)
```

---

## 🚀 Deploy no GitHub Pages

### 1. Criar repositório no GitHub
```bash
git init
git add .
git commit -m "feat: DigitalCron Petrobras v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/digitalcron-petrobras.git
git push -u origin main
```

### 2. Ativar GitHub Pages
- Acesse o repositório → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: **main** · Folder: **/ (root)**
- Clique em **Save**

### 3. Acessar o site
```
https://SEU_USUARIO.github.io/digitalcron-petrobras/
```

> **Importante:** O projeto é 100% estático — sem backend, sem servidor, sem banco de dados. Funciona direto no GitHub Pages.

---

## 🎨 Design System

### Cores (Dark Mode — padrão)
| Variável | Hex | Uso |
|---|---|---|
| `--bg-primary` | `#050816` | Fundo principal |
| `--bg-secondary` | `#0B1023` | Cards secundários |
| `--bg-card` | `#0D1527` | Cards principais |
| `--purple` | `#8B5CF6` | Cor de destaque |
| `--teal` | `#0EA5E9` | Acento azul |
| `--gold` | `#D4AF37` | Dourado (Cesgranrio) |
| `--green` | `#10B981` | Sucesso |
| `--red` | `#EF4444` | Erro/Alerta |

### Tipografia
- Fonte principal: **Montserrat** (Google Fonts)
- Fonte código: **Fira Code** (Google Fonts)

### Temas
- Dark mode (padrão) via `data-theme="dark"` no `<html>`
- Light mode via `data-theme="light"`
- Alternância salva no `localStorage`

---

## 📦 Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| HTML5 | — | Estrutura |
| CSS3 | — | Design system |
| JavaScript ES6+ | — | Engine da aplicação |
| Chart.js | 4.4.0 | Gráficos (CDN) |
| Google Fonts | — | Montserrat + Fira Code |

**Sem frameworks SPA, sem backend, sem banco de dados.**

---

## 💾 Sistema de Persistência (localStorage)

Tudo é salvo no `localStorage` do navegador com o prefixo `dc_petrobras_`.

| Chave | Conteúdo |
|---|---|
| `dc_petrobras_theme` | `"dark"` ou `"light"` |
| `dc_petrobras_user` | Objeto com nome, streak, horas estudadas |
| `dc_petrobras_progress` | Objeto com progresso de cada tópico |
| `dc_petrobras_checklist_*` | Estado do checklist por tópico |
| `dc_petrobras_sidebar_collapsed` | Estado da sidebar |
| `dc_petrobras_weekActivity` | Minutos por dia da semana |

### Exportar/Importar Progresso
- **Exportar:** Dashboard → botão "Exportar" → salva `.json`
- **Importar:** Dashboard → botão "Importar" → carrega `.json`

---

## ➕ Como Adicionar uma Nova Matéria

### 1. Criar a pasta e o arquivo
```
materias/nova-materia/index.html
```

### 2. Usar o template base
```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <!-- ... meta tags ... -->
  <link rel="stylesheet" href="../../assets/css/main.css">
  <link rel="stylesheet" href="../../assets/css/materia.css">
</head>
<body>
<div class="app-layout">
  <div id="sidebar-placeholder"></div>
  <div class="main-content" id="main-content">
    <div id="navbar-placeholder"></div>

    <!-- Seu conteúdo aqui -->

  </div>
</div>
<script src="../../assets/js/app.js"></script>
<script src="../../assets/js/layout.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    await DC.Layout.init('../../');  // ajuste o path para a raiz
    // ... inicializações ...
  });
</script>
</body>
</html>
```

### 3. Adicionar ao sidebar
Em `components/sidebar.html`, adicione um item no menu correspondente.

### 4. Adicionar ao Search Index
Em `assets/js/app.js`, adicione um objeto ao array `DC.Search.INDEX`.

### 5. Registrar questões no simulado
Em `simulados.html`, adicione o objeto da matéria ao objeto `SIMULADOS`.

---

## 🧩 Módulos da App Engine (app.js)

| Módulo | Descrição |
|---|---|
| `DC.Storage` | CRUD no localStorage + export/import JSON |
| `DC.User` | Perfil, streak, favoritos, notas |
| `DC.Progress` | Rastreamento por tópico, salva notas de simulado |
| `DC.StudyTimer` | Cronômetro de sessão em background |
| `DC.Pomodoro` | Timer pomodoro com ciclos automáticos |
| `DC.Theme` | Alternância dark/light persistida |
| `DC.Sidebar` | Collapse, submenu, mobile toggle |
| `DC.Quiz` | Engine completo de simulados com correção |
| `DC.Toast` | Notificações toast não-bloqueantes |
| `DC.Checklist` | Checklist interativo persistido |
| `DC.Search` | Busca global por título e tags |
| `DC.Accordion` | Accordions animados |
| `DC.Tabs` | Sistema de abas |

---

## 🎯 Funcionalidades Implementadas

- [x] Dark/Light mode com persistência
- [x] Sidebar recolhível (desktop) e gaveta (mobile)
- [x] Navbar fixa com busca global
- [x] Dashboard com stats, gráfico semanal e metas do dia
- [x] Pomodoro integrado (25/5/15 min)
- [x] Sistema de progresso por tópico
- [x] Checklist de aprendizado persistido
- [x] Simulados com correção automática e feedback
- [x] Histórico de desempenho nos simulados
- [x] Exportar/Importar progresso em JSON
- [x] Timer de sessão de estudo
- [x] Streak de estudos
- [x] Gráfico radar de progresso por disciplina
- [x] Responsivo para mobile/tablet/desktop
- [x] Página "Entendendo a Cesgranrio" completa

### Em desenvolvimento
- [ ] Revisão espaçada automática
- [ ] Cronograma personalizado
- [ ] Anotações por tópico
- [ ] Favoritos
- [ ] Configurações avançadas

---

## 📚 Conteúdo do Edital Coberto

### Conhecimentos Básicos
- ✅ Língua Portuguesa (hub + 10 questões)
- ✅ Língua Inglesa (hub + 5 questões + teoria)

### Bloco I
- ✅ Arquitetura de Dados (hub + 10 questões)
- 🔜 SQL / DDL / DML (sub-página)
- 🔜 Modelagem de Dados
- 🔜 NoSQL e Big Data
- 🔜 ETL e Integração
- 🔜 Gestão de Projetos (Scrum, PMBOK, SAFe)

### Bloco II
- 🔜 Governança de TI e LGPD
- 🔜 Engenharia de Software
- 🔜 UX e Design Thinking

### Bloco III
- 🔜 Business Intelligence e OLAP
- 🔜 Lógica Matemática
- 🔜 Segurança da Informação

---

## 🛠️ Personalização

### Alterar cores
Edite as variáveis CSS em `assets/css/main.css`:
```css
:root {
  --purple: #8B5CF6;   /* cor principal */
  --gold:   #D4AF37;   /* dourado */
  --teal:   #0EA5E9;   /* azul */
}
```

### Alterar nome do candidato
No Dashboard, campo "Configurar Nome" — salvo automaticamente.

### Alterar metas do dia
Em `dashboard.html`, array `metasDefault`:
```javascript
const metasDefault = [
  'Estudar 1 tópico de Banco de Dados',
  'Resolver 10 questões de Português',
  // ... suas metas
];
```

---

## 📄 Licença

Projeto de uso pessoal para estudos. Conteúdo baseado no edital público da Petrobras/Cesgranrio.

---

**Feito com ⚡ para quem vai passar na Petrobras.**
