# Bonsai 2 local setup

CodeWithPixie uses the OpenAI-compatible server at `http://127.0.0.1:8098/v1`
with a 32,768-token context.

## Start or restart

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_bonsai2.ps1
```

If another process already owns port 8098, the script reports it without
stopping it. To replace that process with the verified configuration:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_bonsai2.ps1 -Restart
```

The defaults can be overridden with `-Server`, `-Model`, `-Port`,
`-ContextSize`, and `-ReasoningBudget`. Logs are written under `logs/`.

## Verified GPU settings

The working GPU settings are `-ngl 64 -fa on`. The model has 64 transformer
blocks, so this offloads those blocks while leaving the output layer on the
CPU. On the tested AMD/HIP build, `-ngl 999` also offloads the output layer
and corrupts responses into repeated `/` characters.

The launcher also enables the Jinja chat/tool template, limits the server to
one parallel slot, and uses a 512-token reasoning budget. Those settings
match the verified process and enable structured tool-call parsing.

Direct chat completion, OpenAI-compatible tool calling, and a full
CodeWithPixie tool turn have been verified with `-ngl 64 -fa on`.

CodeWithPixie uses a 600-second overall timeout and a 120-second read-idle
timeout for this server. These values cover the initial system-prompt prefill
without hiding a stalled connection indefinitely.

The CWP thinking limit is 180 seconds for project creation and editing. The
previous 60-second setting interrupted real file-generation requests. Server
overall timeouts now survive session initialization and thinking-limit changes;
previously initialization silently replaced 600 seconds with 180 seconds.

The earlier 2,048-token server reasoning budget consumed much of a 600-second
project-creation turn before completing both requested files. For more complex
investigations it can be restored explicitly with `-ReasoningBudget 2048`.
