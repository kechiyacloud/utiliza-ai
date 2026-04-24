# Graphify: The Ultimate Setup & Workflow Guide

Graphify is a tool that builds a persistent, optimized knowledge graph out of your codebase, notes, PDFs, or images. By feeding an AI exactly what it needs to see (a map of relationships) instead of the entire source code, you can **significantly reduce token consumption** (up to 70x fewer tokens in large projects) and vastly improve the AI's understanding of your architecture.

This guide covers how to install Graphify and use it efficiently alongside **Antigravity** and **Claude Code**.

---

## 1. Installation 

### Prerequisites
- WSL (Ubuntu/Debian) or macOS/Linux.
- Python 3.10+ installed.
- Claude Code (if you intend to use the Claude skill integration).

### Step-by-Step Installation (Using a Virtual Environment)
Since modern Python distributions restrict global package installations, we'll install Graphify inside a virtual environment.

1. **Open your project directory in WSL:**
   ```bash
   cd /path/to/your/project
   ```
2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. **Install Graphify directly from GitHub:**
   ```bash
   pip install git+https://github.com/safishamsi/graphify.git
   ```

*(Optional Global Install)*: To use graphify globally across all projects, install it using `pipx`:
```bash
sudo apt install pipx
pipx ensurepath
source ~/.bashrc
pipx install git+https://github.com/safishamsi/graphify.git
```

---

## 2. Setting Up Auto-Sync (Important Workflow Step)
To save yourself from constantly having to update the graph manually, install the Git hook. This automatically rebuilds the background knowledge graph every time you create a `git commit`.

```bash
graphify hook install
```

---

## 3. How to Use Graphify in Claude Code
Graphify is designed natively as a "Skill" for Claude Code.

1. **Install the Skill in Claude:**
   Ensure `SKILL.md` is registered in your `~/.claude/CLAUDE.md`. (Running `graphify install` generally handles this, or refer to the Graphify manual setup).
2. **Launch Claude Code in your project:**
   ```bash
   claude
   ```
3. **Run the Skill:**
   In the Claude prompt, type the exact slash command:
   ```text
   /graphify .
   ```
   *Claude will map out your files and keep the output in its local context. For follow-up queries, Claude references the graph instead of the raw code files—drastically reducing output tokens and cost.*

---

## 4. How to Use Graphify in Antigravity

Antigravity operates without the `/slash` command skills but can natively read the outputs that Graphify creates. 

### Step-by-Step Approach
1. **Generate the Artifacts (via AI Prompting)**
   Because Graphify relies intimately on your AI's language models to semantically read and understand your code, you cannot build the full semantic graph via a standalone bash command. Instead, you prompt Antigravity directly in your chat window:

   > *"/graphify . --wiki"*

   *Antigravity will read the `/graphify` workflow instructions, execute its internal extractions, and generate a folder named `graphify-out/` containing `GRAPH_REPORT.md`, `wiki/index.md`, and a JSON file.*

2. **Establish Context (via Prompting)**
   You give Antigravity a prompt that explicitly instructs it to read the generated Graphify files **before** taking action.

### Example Prompting Techniques (Antigravity)

**Prompt Technique 1: Global Context for Large Refactors**
> *"Antigravity, I want to refactor the database connection logic. Before you write any code or make a plan, read the `graphify-out/wiki/index.md` file. Pay attention to the dependencies and 'God nodes' so we don't break downstream services. Propose a plan once you've reviewed it."*

**Prompt Technique 2: Rapid Debugging / Analyzing Bugs**
> *"There's a bug in user authentication where tokens aren't refreshing. Please read `graphify-out/GRAPH_REPORT.md` and check what classes connect to `auth_controller.py`. Use that graph context to find the root cause of the bug."*

**Prompt Technique 3: Adding Features into the Architecture**
> *"I need to add a Dark Mode settings toggle. Use the graphify wiki (`graphify-out/wiki/`) to navigate the current UI components. Identify what component handles state, and inject the dark mode feature exactly where it fits the existing architecture. Keep it localized to avoid structural decay."*

---

## 5. Token Reduction Best Practices

To get the massive 70x token reduction promised by Graphify, rely heavily on these rules:

* **Avoid blind `view_file` calls:** Don't tell your AI to "read all files in the `src/` folder". This burns tokens.
* **Point to the Wiki First:** Instead, tell the AI: *"Start by reading `graphify-out/wiki/index.md`. Only navigate into the actual source `.py` or `.js` files if you absolutely need to modify them."*
* **Keep Images in the Graph, Not the Prompt:** If you have design screenshots or architecture PDFs, let Graphify digest them offline using Claude Vision (`graphify add architecture_diagram.png`). Then, let your AI read the text relationships in the `GRAPH_REPORT.md` instead of uploading the image again.
