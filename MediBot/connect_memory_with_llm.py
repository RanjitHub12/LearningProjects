from chain_setup import create_qa_chain # <-- IMPORT our new function

# --- Main Execution ---
if __name__ == "__main__":
    # Create the QA chain by calling our central function
    qa_chain = create_qa_chain()

    # Start the conversation loop
    print("\n--- RAG Q&A is Ready ---")
    while True:
        user_query = input("\n📝 Write Query Here (or type 'exit' to quit): ")
        if user_query.lower() == 'exit':
            break
        
        # Get the response from the chain
        response = qa_chain.invoke({'query': user_query})
        
        # Print the results
        print("\n💡 RESULT:")
        print(response["result"])
        
        print("\n📚 SOURCE DOCUMENTS:")
        for doc in response["source_documents"]:
            page = doc.metadata.get('page', 'N/A')
            print(f"- Page {page}: {doc.page_content[:150]}...")