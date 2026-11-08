# Dev Squad Phase 0 live image spike — November 8, 2026

Both routes read the exact control text and identified the purple mug. Both described the yellow area as part of the background. The owner required all three observations, including a yellow table, so both routes failed the control.

## Control and scope

The original synthetic PNG was `data/vision-spike/control.png`. Both requests used a neutral `control.png` copy with the same 7944-byte content and SHA-256 `812a2dd55477d30a8a80d709dafec5e1b3e90cedba5423a79720aec292d3531a`. The prompt for both was exactly:

> Describe the image and transcribe all visible text exactly.

The prompt and filename carried none of the three expected details. One image request ran per route, with zero retries. The job used a standalone API request and a disposable native CLI working folder. Production adapters, routing, Demo Two and other project data stayed outside the spike.

## Route 1 — Nemotron free via OpenRouter

- Eligibility verified at 2026-11-08T20:53:00.734Z. Public catalog, account model list and key checks each returned HTTP 200. The exact `nvidia/nemotron-3.5-super-vl:free` row was zero-price in both catalogs. Both listed image input, and the key reported a free-tier account with 23 of 50 requests remaining before the test (27 used).
- The existing Dev Squad route uses the same model and official endpoint with text-only messages. The spike request supplied the documented typed text and image parts. The placeholder below replaces only the actual image bytes. [OpenRouter image format](https://openrouter.ai/blog/tutorials/send-image-to-llm/) · [Model listing](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free)

````json
{
  "model": "nvidia/nemotron-3.5-super-vl:free",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Describe the image and transcribe all visible text exactly."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,<synthetic control bytes>"
          }
        }
      ]
    }
  ],
  "stream": false,
  "max_tokens": 256,
  "reasoning": {
    "enabled": false
  },
  "provider": {
    "allow_fallbacks": false,
    "require_parameters": true,
    "max_price": {
      "prompt": 0,
      "completion": 0,
      "request": 0
    }
  },
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "timeoutMs": 60000
}
````

The request returned HTTP 200 in 1323 ms. Reported model `nvidia/nemotron-3.5-super-vl:free`, finish reason `stop`, 310 input tokens, 88 output tokens, 398 total, and provider-reported cost **$0.00**. Remaining quota was measured before the request.

Verbatim reply:

````text
The image features a stylized illustration of a purple mug set against a two-toned background of white on top and yellow on the bottom. The mug is depicted from a slightly elevated angle, showing its cylindrical body, a dark purple oval representing the interior, and a C-shaped handle on the right side. Above the illustration, there is text.

The text visible in the image is:
ZEBRA-C635AF0F
````

**FAIL.** Purple mug yes. Yellow table no. Exact code yes. The completed answer was scored once.

## Route 2 — Codex Personal CLI

The first login status check in the restricted shell exited 1. The Windows host check exited 0 and confirmed native ChatGPT login. The native allowance RPC at 2026-11-08T20:54:36.317Z reported **Personal Plus**, 4% used in a 10080-minute window, no secondary window and no credits or unlimited allowance. This was the pre-request snapshot.

The configured Codex executable ran with the dedicated Personal `CODEX_HOME`, the existing allowlisted native environment and a disposable working folder containing only `control.png`. Stdin was closed. Timeout was 90 seconds and the capture limit was 65536 bytes. This is the exact argument array. The native account home and temporary directory are omitted.

````json
[
  "exec",
  "--ignore-user-config",
  "--ephemeral",
  "--json",
  "--skip-git-repo-check",
  "--sandbox",
  "read-only",
  "--disable",
  "shell_tool",
  "--disable",
  "multi_agent",
  "--disable",
  "apps",
  "--disable",
  "plugins",
  "-c",
  "model_provider=\"devsquad_hello\"",
  "-c",
  "model_providers.devsquad_hello.name=\"OpenAI\"",
  "-c",
  "model_providers.devsquad_hello.base_url=\"https://chatgpt.com/backend-api/codex\"",
  "-c",
  "model_providers.devsquad_hello.wire_api=\"responses\"",
  "-c",
  "model_providers.devsquad_hello.requires_openai_auth=true",
  "-c",
  "model_providers.devsquad_hello.request_max_retries=0",
  "-c",
  "model_providers.devsquad_hello.stream_max_retries=0",
  "--ignore-rules",
  "-c",
  "web_search=\"disabled\"",
  "-c",
  "mcp_servers={}",
  "-c",
  "approval_policy=\"never\"",
  "-c",
  "cli_auth_credentials_store=\"file\"",
  "-c",
  "forced_login_method=\"chatgpt\"",
  "-c",
  "windows.sandbox=\"mxc\"",
  "--image",
  "control.png",
  "--",
  "Describe the image and transcribe all visible text exactly."
]
````

One turn started and completed in 6587 ms with exit 0. The terminal event reported 13,458 input tokens including 8,960 cached, 54 output tokens and 0 reasoning output tokens. The CLI supplied no dollar cost. This invocation used native ChatGPT authentication without API-key billing overrides.

Verbatim reply:

````text
The image shows a stylized purple mug with a dark purple oval opening and a handle on the right. It sits against a background that is white above and yellow below.

Visible text:
```text
ZEBRA-C635AF0F
```
````

**FAIL.** Purple mug yes. Yellow table no. Exact code yes. The completed answer was scored once.

## Outcome

The flat yellow band was interpreted as background by both models. That may explain the shared miss, but the control and scoring rule were kept fixed. No route qualifies for the media-spec design under this job's pass rule. Native video understanding remains unproven and audio remains untranscribed. No application code or automated tests changed, so a full suite was unnecessary. The checkpoint contains this report and the prompt-log entry. The local evidence and synthetic media remain ignored.
