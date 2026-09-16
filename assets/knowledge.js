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
    text: "Pierce shipped governance automation that cut weeks from data-approval cycles at JPMorganChase, and it became a production internal product. He also led a hackathon team to 4th place in JPMorganChase's global internal hackathon, with architects projecting the platform would save about 80 engineer-hours per month." },

  { topic: "Career timeline",
    text: "Pierce has been at JPMorganChase for over four years and earned two promotions there, moving from Software Engineer to Software Engineer III. Software Engineer III from February 2026 to present. Associate Software Engineer from January 2024 to February 2026. Software Engineer from April 2022 to January 2024." },

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
    text: "NexusPay is Pierce's personal R&D project: a security-first payment-orchestration platform layered on HyperSwitch, built as a Spring Modulith in Java 21 with hexagonal architecture. It features zero-trust multi-tenancy where the tenant is always derived from the authenticated principal rather than a client header, a double-entry ledger with serializable transactions, a transactional outbox streamed to Kafka via Debezium change-data-capture, HMAC-signed webhooks with a dead-letter queue, a fraud and sanctions engine, a dispute state machine, subscription billing, Temporal workflows, HashiCorp Vault for PCI-safe card handling, and Prometheus and Grafana observability. The source repository is currently private, so only the live interface at pierce-lonergan.github.io/NexusPay is publicly viewable. It was built solo with an agent-assisted loop; the architecture, module boundaries, money invariants and test strategy are Pierce's. Honestly positioned, it is an orchestration and reference layer on top of HyperSwitch rather than a payment processor, and it moves no real money. It is a personal project, not JPMorganChase work." },

  { topic: "NexusMatcher project",
    text: "NexusMatcher is Pierce's personal R&D project and a published PyPI package, installable with pip install nexus-matcher, currently version 2.2.0. It maps schema fields onto data-dictionary entries by meaning rather than string equality, and returns a governance verdict of AUTO_APPROVE, REVIEW, or REJECT so a human reviews anything the system is not confident about. The wheel carries its own int8 ONNX encoder, about 33.8 megabytes inside a 22.6 megabyte wheel, so it installs in an airgapped container with no model download and no torch. On a 688-pair labelled benchmark built from BIRD-SQL and OMOP CDM version 5.4 it reaches Precision at 1 of 0.581 and Recall at 10 of 0.878, at roughly 364 fields per second on CPU. Auto-approve deliberately fires on only about 12 percent of fields and is 95.3 percent precise on those. Every number in its README is backed by a JSON artifact in the benchmarks results directory. It is a personal project, not JPMorganChase work." },

  { topic: "NexusPiercer project",
    text: "NexusPiercer is Pierce's data-engineering library for deeply nested JSON and Avro. It flattens nested records into flat, Spark-ready structures with rich metadata, and for Avro it reconstructs them back again with round-trip fidelity. It is published on Maven Central as io.github.pierce-lonergan:nexus-piercer, requires Java 17 or later, is Apache 2.0 licensed, and documents airgapped install routes including a self-contained shaded jar for environments that cannot reach Maven Central. It is the recursive-flattening idea from his JPMorganChase platform work, rebuilt and productized as a personal project." },

  { topic: "MAMMAL drug-repurposing project",
    text: "MAMMAL Cognitive Enhancement Drug Repurposing is a multi-layer Bayesian pipeline built on IBM Research's MAMMAL foundation model. Its mechanism-class track record discriminates clinical success versus failure at AUROC 1.00, and it runs on a single 12 GB consumer GPU." },

  { topic: "Entropy Engine project",
    text: "Entropy Engine is a chaos-engineering benchmark for AI agents: it tests whether an agent can keep a data pipeline intact under schema drift, poison pills, and ten-times backpressure. It is built on Google A2A and Apache Kafka for the Berkeley RDI AgentBeats Competition." },

  { topic: "Series 65 Learning Lab project",
    text: "Series 65 Learning Lab is an interactive, single-file study system for the NASAA Series 65 exam, with 402 flashcards, a 320-plus concept hyperlinked glossary, 20-plus interactive graphics, and a timed exam simulator. It is pure HTML, CSS, and JavaScript with zero build step." },

  { topic: "Momentum-X Research project",
    text: "Momentum-X Research is Pierce's public, falsification-driven research program in systematic equity trading. It ran 311 documented experiments across 39 hypothesis families and 33 registered trials and certified zero tradeable edges; over the same 2016 to 2026 window, buy-and-hold SPY returned 14.91 percent per year and beat the program's own target. Pierce reports that negative result rather than hiding it, because the point of the repository is the machinery that established it honestly: pre-registration with hashed frozen specifications and executable fixtures, a hash-chained tamper-evident trial registry whose promotion bar is computed from the trial count using the Bailey and Lopez de Prado deflated Sharpe ratio, day-clustered and block bootstrap because within-day intraclass correlation of 0.09 to 0.35 means treating stock-days as independent inflates significance by roughly 2.5 times, death dates on every hypothesis, and a rule that re-tuning a live gate voids the arm. It is 74.5 thousand lines across 218 modules with 272 test files, including property-based state machines over the execution bridge and a nightly configuration-truth reconciliation that fired nine genuine breaches the day it was enabled. It also documents its own errors as findings, including a hash-frozen specification that said a 21-day horizon while the runner was coded at 1 day and passed every gate until an adversarial skeptic fleet caught it." },

  { topic: "AcronymKit project",
    text: "AcronymKit is a published PyPI package by Pierce, installable with pip install acronymkit, currently version 0.3.0. It expands governed schema identifiers against a catalog the user supplies, and its central design commitment is that anything the catalog cannot account for is reported as unknown rather than approximated or guessed, which is what makes it safe to use for data governance. It is a typed library with py.typed, MIT licensed, supports Python 3.9 through 3.13, and carries an OpenSSF Scorecard and continuous integration. It connects directly to the canonical-catalog and semantic schema-matching work Pierce does at JPMorganChase." },

  { topic: "Published open-source packages",
    text: "Pierce maintains three published open-source packages across two ecosystems: nexus-matcher version 2.2.0 and acronymkit version 0.3.0 on PyPI, and nexus-piercer on Maven Central under the group io.github.pierce-lonergan. Publishing to a public registry means the packaging, licensing, dependency hygiene and release process are done to a standard strangers can install against, not just code that runs on his own machine." },

  { topic: "Education",
    text: "Pierce earned a Bachelor of Science in Biochemistry with a minor in Computer and Information Science from The Ohio State University, from August 2016 to December 2021. Coursework spanned machine learning, distributed computing, multithreading, and database systems." },

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
