# Dev Squad media capability spike

November 8, 2026. Phase 0 stopped at the vision gate. The current transports deliver text to every worker, so no route proved that it could read the control media through Dev Squad's existing invocation. Product code and the running backend stayed at the verified baseline.

## Controls and evidence

- PNG control was 7,944 bytes. It showed a purple mug, a yellow table and the randomly generated label `ZEBRA-C635AF0F`. The worker prompt contained only `Describe the attached media.`
- MP4 control was 20,403 bytes and 12 seconds long. It showed a counter progressing from 0 to 3, with a blue background at 3. The clip had zero audio tracks.
- The real upload and Send routes ran against an isolated, disposable database. A fetch interceptor captured the real API request bodies in memory. A spawn interceptor captured the real CLI arguments and stdin. The interceptors prevented all provider calls and native model launches. Authentication and the Nemotron catalog were fixtures, so account access remains unverified in this spike.
- All ten checks confirmed the stored attachment hash and saved message binding. Each captured packet contained zero attachments and excluded the media path, image or video bytes, and the visual control label. No simulated model result was counted as vision.
- Evidence and reproduction scripts are local under `data/vision-spike/`. The `boundary-results.json` summary contains no credential, raw reply or project media from the owner's workspaces.

| Route | PNG and MP4 boundary evidence | Vision verdict |
|---|---|---|
| Codex Personal and School | Both profiles sent the same text packet format on stdin. The captured invocation had no `--image` argument. | Unproven through this launcher |
| Claude Code | The launch passed JSON text on stdin and used the existing disabled tool configuration. | Unproven through this launcher |
| DeepSeek | The official chat completions request contained two string-valued messages and no media parts. | Unproven through this adapter |
| Nemotron | The existing OpenRouter chat completions request contained two string-valued messages and no media parts. | Unproven through this adapter |

The common omission happens in `conversationContext`, which skips attachments without string `content`, and `ProjectFiles.snapshot`, which excludes `references/`. `ProjectStudio` builds the worker packet from those two sources. This is a transport finding. No model was given an opportunity to identify the visual control.

## Video and audio

Installed FFmpeg 9.0.1 decoded the 12-second clip and extracted six frames with `fps=1/2` and `-frames:v 12`. Frame extraction is verified locally. A vision interpretation of the frames and native video input remain unproven. No local transcription tool was identified by the installed-command check, and no audio transcription was tested. Any future spec would need to say **audio not transcribed** until a local route passes a spoken control.

## Narrow next options

1. Test the existing OpenRouter Nemotron route with a single synthetic `image_url` part. OpenRouter lists `nvidia/nemotron-3.5-super-vl:free` at zero input/output price and advertises image and video inputs. The existing account's modality access and remaining quota still need confirmation. Keep zero-price and no-fallback checks. The free endpoint restricts confidential and personal data, so a synthetic control is appropriate. [Exact model and endpoint terms](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free) · [Official image request format](https://openrouter.ai/blog/tutorials/send-image-to-llm/)
2. Test the installed Codex binary with its documented `exec --image <FILE>` argument, the existing native login and a single hash-verified synthetic file. The exact installed binary's help exposed the flag. Actual vision inside Dev Squad's Windows restrictions and the account's remaining included usage are unverified.

A subsequent video spike could use the verified local FFmpeg extraction and an image route that first passes the control. OpenRouter also documents `video_url` for native video input, but neither the current request nor this account has demonstrated it. [Official modality mapping](https://openrouter.ai/blog/insights/every-modality-one-api/)

## Verification status

Ten of ten offline transport checks passed. Zero vision routes passed the live control. Acceptance checks 1–7 were not run because Phase 0 did not pass. The 760/760 full-suite result belongs to the preceding Reviewer repair. This documentation-only spike did not change product code, run a live model, create a production VisionTest project, or require a backend restart. `.env`, databases, backups, media and logs are excluded from this checkpoint.
