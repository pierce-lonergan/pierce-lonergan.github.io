/* =========================================================================
   Pierce Lonergan - resume knowledge base
   Plain facts the in-browser assistant retrieves over (client-side RAG).
   Each entry is a short, self-contained chunk. No secrets, all public.
   ========================================================================= */
window.PL_KB = [
  { topic: "Current role",
    text: "Pierce Lonergan is a Software Engineer III at JPMorganChase in Data Engineering, based in Columbus, Ohio. He builds the high-throughput streaming and batch data infrastructure that Consumer and Community Banking runs on." },

  { topic: "Platform work",
    text: "At JPMorganChase, Pierce architected reusable streaming-pipeline infrastructure: declarative source, sink, and transform factories, built-in forward-compatible schema evolution, and generic recursive flattening for arbitrarily nested data. This lifted his team from roughly 2 to roughly 30 production pipelines per month." },

  { topic: "Reliability and reuse",
    text: "Pierce solved pipeline lifecycle concerns once and reused them everywhere: checkpointing, error handling, and graceful shutdown standardized across every pipeline. This is a platform mindset focused on reusable building blocks rather than one-off jobs." },

  { topic: "Governance automation",
    text: "Pierce shipped governance automation that cut weeks from data-approval cycles at JPMorganChase, and it became a production internal product. He also led a hackathon team to 4th place globally, with architects projecting the platform would save about 80 engineer-hours per month." },

  { topic: "Career timeline",
    text: "Pierce has been at JPMorganChase for over four years with three promotions. Software Engineer III from February 2026 to present. Associate Software Engineer from January 2024 to February 2026. Software Engineer from April 2022 to January 2024." },

  { topic: "Earlier engineering work",
    text: "As an Associate Software Engineer, Pierce built high-performance ETL Spark pipelines with asynchronous processing and parallelization, and integrated Kafka for near-real-time distributed streaming, reducing latency and improving reliability. Earlier, as a Software Engineer, he modernized big-data systems with reactive paradigms using Project Reactor, paired Kafka messaging with Cassandra reconciliation and Spark ETL, and began migrating high-throughput systems to federated AWS." },

  { topic: "Streaming and big data skills",
    text: "Pierce's streaming and big-data stack includes Apache Kafka, Apache Spark, Spark Structured Streaming, Project Reactor, Cassandra, Apache Avro, schema evolution, change data capture, and exactly-once processing." },

  { topic: "Lakehouse and warehouse skills",
    text: "For the lakehouse and warehouse, Pierce works with Apache Iceberg, Snowflake, Parquet, partitioning strategies, data modeling, and incremental sync." },

  { topic: "Cloud and infrastructure skills",
    text: "Pierce's cloud and infrastructure skills include AWS S3, EMR, MSK, Glue, Kinesis, and Lambda, plus Docker, CI/CD, and hexagonal architecture." },

  { topic: "Applied ML and retrieval skills",
    text: "In applied ML and retrieval, Pierce works with Retrieval-Augmented Generation (RAG), hybrid retrieval combining BM25 and dense vectors, ColBERT and cross-encoder reranking, BGE embeddings, the Qdrant vector database, LLM applications, and INT8 quantization." },

  { topic: "Data governance skills",
    text: "Pierce's data governance skills cover canonical catalogs, semantic schema matching, entity resolution, lineage, and data-quality validation." },

  { topic: "Languages",
    text: "Pierce programs primarily in Python, Java, and Scala, and also uses Groovy, Bash, and SQL." },

  { topic: "NexusPay project",
    text: "NexusPay is Pierce's personal R&D project: an enterprise payment-operations platform layered on HyperSwitch. It is a 17-module Spring Modulith built in Java 21 and Spring Boot 3.2 with hexagonal architecture, featuring a double-entry ledger with serializable transactions, a transactional outbox streamed to Kafka via Debezium change-data-capture, a fraud rules engine, FX and cross-border payments, a dispute state machine, subscription billing, Keycloak single sign-on with maker-checker approval workflows, Temporal workflows, HashiCorp Vault for PCI card storage, and full Prometheus and Grafana observability. It spans roughly 845 Java files and 51 database migrations. It is the most substantial of his personal projects, and it is a personal project, not JPMorganChase work." },

  { topic: "NexusMatcher project",
    text: "NexusMatcher is Pierce's personal R&D project: an enterprise-grade semantic schema-matching system using multi-stage retrieval, neural reranking, and learned type projections. It reaches 100 percent Precision at 1, sub-4-millisecond rerank latency, and has 433 passing tests. It is a personal project, not JPMorganChase work." },

  { topic: "NexusPiercer project",
    text: "NexusPiercer is a data-engineering toolkit that pierces through deeply nested JSON and Avro, flattening, consolidating, and analyzing data and schemas into flat, Spark-ready structures with rich metadata. It is the recursive-flattening engine, productized." },

  { topic: "MAMMAL drug-repurposing project",
    text: "MAMMAL Cognitive Enhancement Drug Repurposing is a multi-layer Bayesian pipeline built on IBM Research's MAMMAL foundation model. Its mechanism-class track record discriminates clinical success versus failure at AUROC 1.00, and it runs on a single 12 GB consumer GPU." },

  { topic: "Entropy Engine project",
    text: "Entropy Engine is a chaos-engineering benchmark for AI agents: it tests whether an agent can keep a data pipeline intact under schema drift, poison pills, and ten-times backpressure. It is built on Google A2A and Apache Kafka for the Berkeley RDI AgentBeats Competition." },

  { topic: "Series 65 Learning Lab project",
    text: "Series 65 Learning Lab is an interactive, single-file study system for the NASAA Series 65 exam, with 402 flashcards, a 320-plus concept hyperlinked glossary, 20-plus interactive graphics, and a timed exam simulator. It is pure HTML, CSS, and JavaScript with zero build step." },

  { topic: "Education",
    text: "Pierce earned a dual Bachelor of Science in Biochemistry and a Bachelor of Science in Computer Science and Engineering from The Ohio State University, from August 2016 to December 2021. Coursework spanned machine learning, distributed computing, multithreading, and database systems." },

  { topic: "Recognition",
    text: "Pierce won Best Data Visualization at ASA DataFest 2021, awarded by the American Statistical Association at The Ohio State University, for visual analysis of the U.S. 2019 Non-Medical Use of Prescription Drugs survey using Python, R, and ArcGIS." },

  { topic: "Approach and philosophy",
    text: "Pierce's foundation is scientific, from his biochemistry and computer-science training, which shows up as a bias toward measurement, evaluation, and honest results over hype. He favors reusable platforms over one-off solutions." },

  { topic: "What he is looking for",
    text: "Pierce is open to new opportunities in applied machine learning, data engineering, and platform work. The fastest way to reach him is LinkedIn." },

  { topic: "Contact",
    text: "You can reach Pierce on LinkedIn at linkedin.com/in/pierce-lonergan-84034422a and see his code on GitHub at github.com/pierce-lonergan." },

  { topic: "About this assistant",
    text: "This assistant runs entirely inside your web browser. When your device supports WebGPU it loads a small language model locally with WebLLM, grounded by retrieval over Pierce's resume. Nothing you type is sent to any server and there are no API keys. Where WebGPU is unavailable it answers with fast on-device retrieval instead. Pierce built it to demonstrate consumer-AI product engineering." }
];
