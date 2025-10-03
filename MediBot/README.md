###### HealthMate Bot 🩺

HealthMate Bot is an intelligent RAG (Retrieval-Augmented Generation) chatbot designed to answer questions about a private collection of health-related PDF documents. It uses the power of Large Language Models (LLMs) through the Groq API for fast responses, combined with a local vector store (FAISS) to ensure your data remains private.

The application features a user-friendly web interface built with Streamlit and a command-line interface for quick testing.

##### Features

- **Interactive Chat Interface:** A clean and modern UI built with Streamlit for easy interaction.
    
- **Accurate, Sourced Answers:** The bot uses your private documents to answer questions and provides the source snippets it used, allowing for verification.
    
- **Fast Responses:** Powered by the high-speed Groq API and the Llama 3.1 model.
    
- **Data Privacy:** Your documents are processed locally to create embeddings, and only relevant text chunks are sent to the LLM for answer generation.
    
- **Modular Codebase:** The project is structured logically, separating data processing, chain configuration, and user interfaces.
    
- **Dual Interfaces:** Includes both a Streamlit web app (`app.py`) and a command-line interface (`connect_to_memory.py`).
    

##### How It Works

The project follows a standard RAG pipeline:

1. **Load & Chunk:** PDF documents from the `data/` directory are loaded and split into smaller, manageable text chunks.
    
2. **Embed & Store:** Each text chunk is converted into a numerical representation (embedding) using a local Sentence Transformer model. These embeddings are stored in a FAISS vector database in the `vectorstore/` directory.
    
3. **Retrieve:** When you ask a question, the bot embeds your query and retrieves the most relevant text chunks from the FAISS database.
    
4. **Generate:** The retrieved chunks (context) and your original question are sent to the Groq LLM, which generates a coherent, context-aware answer.
    

###### Project Structure

```
.
├── data/                  # <-- Add our PDF files here
├── vectorstore/           # <-- The created FAISS database is stored here
│   └── db_faiss/
├── .env                   # <-- our API keys are stored here
├── app.py                 # Main Streamlit application
├── chain_setup.py         # Core logic for the LangChain RAG chain
├── create_memory.py       # Script to create the vector database
├── connect_to_memory.py   # Command-line interface for the bot
└── requirements.txt       # Python dependencies
```

###### ⚙️ Usage

Running the application is a three-step process.

 Step 1: Add Your Documents

Place all the PDF files you want the chatbot to know about into the `data/` directory.

 Step 2: Create the Vector Database

Run the `create_memory.py` script. This will process your PDFs and create the local FAISS vector store. You only need to do this once, or whenever you add, remove, or change the documents in the `data/` folder.

```
python create_memory.py
```

 Step 3: Run the Application

You can now start the chatbot.

##### Option A: Run the Streamlit Web App (Recommended)

This is the primary way to interact with the bot.

```
streamlit run app.py
```

Navigate to the local URL provided by Streamlit in your web browser (usually `http://localhost:8501`).

##### Option B: Run the Command-Line Interface

For quick tests and interactions without a GUI.

```
python connect_to_memory.py
