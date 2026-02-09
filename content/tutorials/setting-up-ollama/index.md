---
title: Setting Up Ollama for Local AI
description: A step-by-step tutorial on installing and running Ollama to use large language models locally on your machine.
author: Michael Collins
authorUrl: https://michaelcollins.xyz
date: 2026-02-09
difficulty: Beginner
allowEmbed: true
version: '1.0.0'
versionStatus: latest
---

# Setting Up Ollama for Local AI

This tutorial walks you through installing Ollama and using its built-in chat app to download a model and start chatting. Most of this guide is no-terminal.

::iframe-component{src="https://www.youtube.com/watch?v=8amsyT4NUrM" title="Setting up Ollama for running AI models locally"}
::

## What is Ollama?

Ollama is a free tool that runs AI models locally. It includes a desktop app where you can download a model and chat with it, similar to other AI chat products.

**Why run models locally?**

- **Privacy** — your data never leaves your machine
- **No usage costs** — once downloaded, models run for free
- **Offline access** — works without an internet connection
- **Experimentation** — try many different models quickly

## Prerequisites

Before starting, make sure you have:

- A computer with at least **8 GB of RAM** is needed for smaller models, though 16 GB or larger is recommended. The more RAM, the better! This tends to be the hardware component that leads impact on what models can be run, though GPU and CPU are also important. 
- **macOS** or **Windows** (Linux works too, but often involves more setup)
- An internet connection (for downloading the app and a model)
- Free disk space (many models are several GB in size)

## Step 1: Install Ollama (the background engine)

### macOS

Download the installer from the official website:

1. Visit [https://ollama.com/download](https://ollama.com/download)
2. Click the **macOS** button
3. Open the downloaded `.dmg` file and drag Ollama to your Applications folder
4. Launch Ollama from Applications — you'll see the llama icon appear in the menu bar

### Windows

1. Visit [https://ollama.com/download](https://ollama.com/download)
2. Click the **Windows** download button
3. Run the installer and follow the prompts

### Linux

1. Visit [https://ollama.com/download](https://ollama.com/download)
2. Click the **Linux** button
3. Copy the installation command into the terminal

Setup may vary by distribution.

## Step 2: Make sure Ollama is running

Ollama usually runs quietly in the background.

- **macOS:** Look for the Ollama (llama) icon in the **menu bar**.
- **Windows:** Look for Ollama in the **system tray** (near the clock) or in your Start menu.

If you don't see it running, open Ollama from your Applications (macOS) or Start menu (Windows).

## Step 3: Open the Ollama chat app

Open the Ollama desktop app.

- **macOS:** Open **Ollama** from Applications.
- **Windows:** Open **Ollama** from the Start menu.

If you see a chat screen, you're in the right place.

## Step 4: Select and download a model

In the Ollama app, there is a models drop-down in the chat bar. Choose one already downloaded or select a new one to download and use the model.

### Models and descriptions (as of this writing)

Models are updated frequently, so you may also want to do some research on your own to identify the best model for your needs.

| Model | Best for | Pros | Cons |
|---|---|---|---|
| `phi3` | Everyday Q&A, quick drafts, basic help | Fast on most computers, smaller download, good "starter" model | Less accurate than larger models, not as strong for complex writing or reasoning |
| `llama3.2` | General-purpose chat, writing help, study help | Strong all-around, better answers than very small models | Larger download, can feel slower on older laptops |
| `gemma3` | Great general chat, summarizing, (sometimes) image + text questions | Very capable for a wide range of tasks; available in multiple sizes | Some sizes are a bigger download; may feel slower on older machines |
| `qwen3` | Clear writing, structured answers, multi-step tasks | Strong instruction-following; lots of size options | Larger sizes can be heavy; smaller sizes may be less accurate |
| `deepseek-r1` | Reasoning-heavy questions (math, logic, planning) | Often stronger at "think it through" tasks | Can be slower; can produce longer answers than you want |
| `mistral` | Writing and summarization | Good balance of quality and speed | Older than some newer families; quality varies by use case |
| `llama3.3` | Highest-quality chat (if you have a powerful computer) | Excellent results when your hardware can handle it | Very large download and resource use; not recommended for most laptops |

Tip: If you're not sure, start with `phi3`. If you want better answers and your computer can handle it, try `llama3.2`, `gemma3`, or `qwen3`.

Pick a beginner-friendly model, then download it:

- **Smaller / faster:** `phi3`
- **Balanced:** `llama3.2`

Notes:

- Model downloads can be several GB and may take a while.
- If your computer feels slow or hot, choose a smaller model.

## Step 5: Start a new chat

Once a model is downloaded, select it in the app's chat bar.

Type your first message to create a new chat.

## Step 6: Try a quick chat

In the Ollama app, try asking:

- "Summarize this paragraph in 3 bullet points: ..."
- "Help me write a polite email."
- "Explain photosynthesis like I'm 12."

If responses are too slow, switch to a smaller model.

## Step 7 (Optional): Remove models to free up disk space (Terminal)

Models can take up a lot of storage. If you want to remove a model you no longer use, you can do it from the terminal.

Open a terminal:

- **macOS:** Applications -> Utilities -> Terminal
- **Windows:** Start menu -> Windows Terminal (or PowerShell)

List your installed models:

```bash
ollama list
```

Remove a model:

```bash
ollama rm phi3
```

*Note:* You may be asked to enter your password. Just be careful with the `rm` command, this permanently deletes files from your computer.

If a model will not remove, make sure it is not currently selected or running in the Ollama app, then try again. You may also need to restart your computer.