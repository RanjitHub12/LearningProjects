# chain_setup.py

from dotenv import load_dotenv, find_dotenv

# LangChain Imports 
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

# Loading Environment Variables 
load_dotenv(find_dotenv())

# Configuration 
DB_FAISS_PATH = "vectorstore/db_faiss"
MODEL_NAME = "llama-3.1-8b-instant"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Central Function to Create the QA Chain 
def create_qa_chain():
    """
    Creates and returns a RetrievalQA chain.
    This function encapsulates the entire setup process.
    """
    print("Setting up QA chain...")
    
    # Load the vector store
    embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    db = FAISS.load_local(DB_FAISS_PATH, embedding_model, allow_dangerous_deserialization=True)
    
    # Initialize the Groq LLM
    llm = ChatGroq(model=MODEL_NAME, temperature=0.5, max_tokens=512)
    
    # Create a custom prompt
    prompt_template = """
    Use the pieces of information provided in the context to answer the user's question.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.

    Context: {context}
    Question: {question}

    Start the answer directly. No small talk please.
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    
    # Create the RetrievalQA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=db.as_retriever(search_kwargs={'k': 3}),
        return_source_documents=True,
        chain_type_kwargs={'prompt': prompt}
    )
    
    print("✅ QA chain is ready.")
    return qa_chain
