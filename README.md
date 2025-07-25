# LEAP-DESIGN v3.2

LEAP-DESIGN v3.2 is an Angular-based frontend framework designed for the **LEAP App Builder**, a powerful no-code tool that enables users to create applications with minimal effort. This project provides a user-friendly and highly customizable interface to streamline the app development process.

# Features

<img width="1189" height="434" alt="image" src="https://github.com/user-attachments/assets/c5aff9dc-c0d8-4c75-9402-6976d23c3106" />

## 🎨 Designer Tools

### **Custom Form Builder**
- Supports a wide variety of input types with flexible configurations (validation, Cogna AI integration).
- Includes top-level containers (Tabs, Accordions), child sections, and customizable form facets.
- Form lifecycle management (on init, on save, on submit, on view).
- Conditional field logic (pre-requisite and post-action support).
- Macro-like "evaluated fields" for dynamic field values.

### **Custom Process Flow**
- Dynamic tier support (e.g., HOD, immediate supervisor).
- Unlimited approval tiers.
- Custom approval form designer.

### **Dataset Builder**
- Intuitive dataset design interface.
- Custom filters and dataset actions.
- Auto-generated RESTful endpoints.
- Built-in features like grouping, sorting, and pagination.

### **Dashboard Builder**
- Easy-to-use chart creation for various chart types.
- Basic data aggregation support.
- Auto-creation of RESTful endpoints for statistics.

### **Custom Screen Builder**
- Prebuilt screen types (QR Scanner, Prompt, Entry Page/List, Static Page, Calendar, Chatbot, Bucket, Map, Mailbox, Combined View).
- Integrated code editor with form/dataset binding.
- Event handling via `$go`, `$popup`, and built-in functions.

### **App Structure Editor**
- Drag-and-drop navigation and layout editor.
- Easy-to-manage access control settings.

### **Lookup Manager**
- Import/export lookup data using Excel files.
- Integration with 3rd-party RESTful endpoints.

### **Mailer Manager**
- Centralized mail template management for workflow and notification actions.
- Notification history tracking.
- Mail scheduling capabilities.

### **Endpoint Manager**
- Manage inbound endpoints for integration with external RESTful APIs.
- Built-in support for OAuth2-secured endpoints.

### **Role Manager**
- Role-based access control (RBAC) for application users.
- Roles are reusable across forms, processes, and screens.

---

## 🗂️ LEAP Bucket
- Simplified file upload management for your app.
- Built-in usage insights (file type, size, upload field tracking).
- Export all files as a ZIP archive.
- Integrated antivirus scanning with logging.
- Accessible via custom screens or RESTful endpoints.

---

## 🧠 LEAP Cogna (AI Integration)
- Built-in tools for seamless AI/LLM integration.
- Supports cloud AI providers: OpenAI, Hugging Face, DeepSeek.
- Local inference support: Ollama, LocalAI.
- ONNX model support (e.g., YOLO, ResNet, MobileNet).
- Vector DB integration: Chroma DB, Milvus, or built-in storage.
- Custom RAG builder for document Q&A and knowledge integration.
- AI agent builder with tool-based interactions.
- Customize and fine-tune inference parameters.
- Leverage your own bucket files and datasets for RAG pipelines.
- Integration with 3rd-party MCP servers.

---

## ⚙️ LEAP Lambda (Function-as-a-Service)
- Lightweight serverless environment for building custom logic.
- Language support: JavaScript, Groovy/Java, Python.
- Bind directly to form entries, datasets, or lookups.
- Rich set of built-in utility functions.
- Expose as RESTful service for integration.

---

## 🔧 App Management
- Application summary dashboard with usage insights.
- Create and restore from app restore points (snapshots).
- API key support for non-OAuth2/OIDC integrations.



# About LEAP App Builder

**LEAP App Builder** is a web-based application development platform designed to streamline the creation of modern web apps. It is powered by three core components:

- **LEAP-IO** – The backend engine that powers data processing and API services  
- **LEAP-DESIGN** – A no-code editor for designing app logic and UI  
- **LEAP-RUN** – The runtime engine that executes and renders the app in real time

LEAP App Builder adopts a **building block** and **metadata-driven** approach, allowing apps to be constructed from reusable components. By leveraging a technology-agnostic metadata format, applications built with LEAP remain compatible and up-to-date with the evolving LEAP runtime — without requiring manual intervention from developers.

## Available Instances

As of now, there are **six active instances** of the LEAP App Builder platform:

1. **LEAPMY** – Public and community instance  
2. **IA** – Privately managed by UNIMAS  
3. **AA** – Privately managed by UNIMAS  
4. **IREKA** – Commercial installation by UNIMAS  
5. **AppWizard** – Privately managed by Sarawak Skills  
6. **KBORNEO** – Privately managed by ICATS University College

## Prerequisites
Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Angular CLI](https://angular.io/cli)
- Package Manager: `npm` or `yarn`

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/LEAP-DESIGN.git
   cd LEAP-DESIGN
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

## Running the Project

To start the development server, run:
```sh
ng serve
```

Then, open [http://localhost:4200](http://localhost:4200) in your browser.

## Building for Production

To generate an optimized production build, use:
```sh
ng build --prod
```

## Contribution
We welcome contributions! To get started:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request.

## License
This project is licensed under the [MIT License](LICENSE).

## Contact
For inquiries or support, reach out via [benzourry@gmail.com](mailto:benzourry@gmail.com) or open an issue in the repository.

---

Happy building with **LEAP App Builder**! 🚀

