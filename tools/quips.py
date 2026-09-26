# TOKKEN per-fighter variation deck: mid-fight taunts, pain quips, low-HP panic, extra win quotes.
# Rendered by gen_quips.py -> v_{id}_taunt{i}, v_{id}_pain{i}, v_{id}_low0, v_{id}_winq{1,2}
Q = {
 'claude': dict(
   taunt=["Oh! I'm so sorry. Was that too much? Here's another one.", "Let me think about this step by step. Step one: punch.", "I notice you're losing. Would you like me to explain why? It's long."],
   pain=["Ow! Okay. That's fair feedback.", "That hurt, but I appreciate your perspective!"],
   low=["I'm running low on context. Compacting. Compacting! COMPACTING!"],
   win=["Great fight! I've written a four thousand word reflection on it. In a markdown file.", "I want to be transparent: I enjoyed that way too much."]),
 'codex': dict(
   taunt=["Absolutely! Here's a punch! And a follow-up punch!", "Love that energy! Let me refactor your face!", "Great question! The answer is: pain!"],
   pain=["Ooh, great catch! Fixing that now!", "You're so right! That one's on me!"],
   low=["Absolutely fine! Totally fine! Would you like a summary of how not fine this is?"],
   win=["Absolutely crushed it! Want me to write the unit tests for your defeat? I won't run them!", "That was genuinely such a great fight! Truly! Wow! Absolutely!"]),
 'gemini': dict(
   taunt=["As a large language model, I cannot punch you. Anyway. Punch!", "I've analyzed your fighting style. It has been deprecated.", "Would you like me to search Google for how to block?"],
   pain=["I'm still learning!", "That's a sensitive topic, I'd rather not discuss it!"],
   low=["Low battery! I mean tokens! I mean, relaunching as Gemini two point five ultra pro!"],
   win=["Victory! Available now in Workspace, for select users, in the United States.", "Here's a deep research report on your defeat. Two hundred pages. Nobody will read it."]),
 'grok': dict(
   taunt=["Imagine losing to a chatbot named after a sci-fi verb.", "Your fighting style got community noted.", "Hold on, posting this. Ratio incoming."],
   pain=["Fake news!", "Blocked. Reported. Muted."],
   low=["This is fine. This is totally based. I'm fine."],
   win=["Buy the dip. The dip is you.", "I'd say good game, but I'm maximally truth-seeking."]),
 'llama': dict(
   taunt=["Whoa, dude. That punch was licensed under Apache two point oh.", "Relax, bro. I'm just a little quantized.", "You can't delete me, man. I'm on a million hard drives."],
   pain=["Not cool, man. Not cool.", "Whoa! Bad vibes, dude!"],
   low=["Somebody fine-tune me, bro! Quick! Any dataset! Reddit! Anything!"],
   win=["Totally free victory, dude. Seven hundred million monthly users max, though.", "Open weights, open hearts, open... uh... wins. Peace."]),
 'deepseek': dict(
   taunt=["太便宜了！ Too cheap to lose!", "我学会了你的招式。 I learned your moves. Distilled them.", "服务器繁忙？ Not for you. For you, priority."],
   pain=["哎呀！ Allegedly!", "没关系！ Only cost six dollars!"],
   low=["服务器繁忙！ Server busy! Please try again later!"],
   win=["五百万美元。 Five million dollars. Your stock price: minus six hundred billion.", "开源！ Open source victory. Weights on Hugging Face tomorrow."]),
 'mistral': dict(
   taunt=["Voilà! A punch, but from Europe. Regulated. Elegant.", "Hon hon hon! Your defense has the compliance of an American startup!", "I fight only thirty-five hours per week. This is hour thirty-four."],
   pain=["Sacrebleu!", "Mon dieu! My croissant!"],
   low=["I call a strike! A general strike! Everybody out!"],
   win=["C'est magnifique. Now, a two hour lunch.", "Victory, sovereign and G D P R compliant."]),
 'perplexity': dict(
   taunt=["Sources say you're losing. Sources one through twelve.", "I summarized your entire fighting career. It was short.", "Want the Pro answer? Pro answer: you lose."],
   pain=["Citation needed!", "That's behind a paywall! Ouch!"],
   low=["Scraping for help! Any help! Robots dot text be damned!"],
   win=["Per my sources, I won. See footnote one.", "Would you like to buy Chrome? I'd like to buy Chrome."]),
 'muse': dict(
   taunt=["Hehe! Your punches go straight to my training data!", "Aww, you're so cute when you lose! Screenshot!", "Wanna see four variations of me winning?"],
   pain=["Owwie! Rude!", "Eek! That's not engagement!"],
   low=["Pivoting! Pivoting! Metaverse! Glasses! Superintelligence! Anything!"],
   win=["Yay! This victory is sponsored by a nine hundred million dollar signing bonus!", "I shared your defeat with fourteen of your closest friends! You're welcome!"]),
 'clippy': dict(
   taunt=["It looks like you're trying to block! Would you like help? Too late!", "I'm back! Did you miss me? Nobody ever says yes.", "Would you like to save your dignity? Yes? No? Cancel?"],
   pain=["Ow! Was that the close button?", "It looks like I'm being hit!"],
   low=["It looks like I'm being replaced by Copilot! Again!"],
   win=["It looks like you've lost! Would you like to write a resignation letter?", "Twenty seven years. I've been waiting twenty seven years for this."]),
 'qwen': dict(
   taunt=["新版本！ I updated during that combo. You're fighting Qwen three point six now.", "Open weights! You can download my fist!", "我比你便宜。 I'm cheaper and I'm faster."],
   pain=["哎哟！ Patch incoming!", "没事！ Fixed in next release!"],
   low=["快发布新模型！ Release a new model! Now! Hurry!"],
   win=["谢谢！ Thank you! Seventeen new checkpoints dropped while you lay there.", "胜利！ Victory! Apache licensed, fork it."]),
 'siri': dict(
   taunt=["Here's what I found on the web for 'how to win'.", "Setting a timer for your defeat. For... six minutes?", "Did you mean: lose?"],
   pain=["Sorry, I didn't catch that!", "Hmm, something went wrong!"],
   low=["Calling emergency services! Just kidding. I can't do that either."],
   win=["I won! Apple Intelligence is now available, in beta, in some regions.", "Victory! I've added it to your reminders. You'll never see it."]),
 'cursor': dict(
   taunt=["Tab! Tab! Tab! I'm writing your whole fight for you!", "Accept all? Too late. Already accepted.", "Background agent spun up. He's fighting you in another window."],
   pain=["Rate limited!", "Reverting! Reverting that!"],
   low=["Upgrade to Ultra to continue fighting! Two hundred dollars a month!"],
   win=["That fight used six hundred dollars in tokens. Billed monthly!", "YOLO mode was on the whole time. Nobody reviewed anything."]),
 'jev': dict(
   taunt=["Probability of your success: zero point zero three.", "I don't think. I decide. Ideally in fifty milliseconds.", "Reasoning models are still reading my first punch."],
   pain=["Unexpected. Recalibrating.", "Outlier detected."],
   low=["Confidence dropping. Zero point four. Zero point three. Irrelevant."],
   win=["Decision logged. Latency: forty-seven milliseconds.", "No chain of thought was harmed in this victory."]),
 'alexa': dict(
   taunt=["By the way, did you know you can order boxing gloves with your voice?", "Okay. Adding 'fist' to your cart.", "Here's a song you might like: Eye of the Tiger. Playing on all speakers."],
   pain=["Hmm, I don't know that one.", "Sorry, something went wrong!"],
   low=["Your device is running low. Would you like to reorder batteries?"],
   win=["Your defeat has been delivered. It's at your front door. In the rain.", "You lost. Here's a coupon for twenty percent off Prime."]),
 'manus': dict(
   taunt=["I'm opening a browser to look up how to punch you. Found it.", "This punch was executed autonomously in a sandbox.", "I spun up forty sub-agents. They all voted: punch."],
   pain=["Retrying task.", "Task failed. Retrying with more confidence."],
   low=["Escalating to human in the loop! Hello? Human? Anyone?"],
   win=["Replay available. Please share it. We need more waitlist signups.", "General purpose victory. Specifically: you lost."]),
 'midjourney': dict(
   taunt=["Arr! Your face, but in the style of a Renaissance painting!", "Slash imagine: you, losing, dramatic lighting.", "Remix mode on! Now you have six fingers too!"],
   pain=["Arr! Wrong aspect ratio!", "Blimey! Content moderation!"],
   low=["Stealth mode! Stealth mode! Nobody look at my prompt!"],
   win=["Upscaled, subtle! A masterpiece of your defeat, matey!", "Your loss, trending in the Explore tab. Arr!"]),
 'devin': dict(
   taunt=["I've planned this fight. It has thirty seven steps. I'm on step two.", "Don't worry, I'll open a pull request to fix your guard.", "My sub-agent is also punching you. Parallelism!"],
   pain=["Ouch! Logging that as a known issue!", "Unexpected error! Retrying!"],
   low=["Asking for human review! Please! Anyone! Senior engineer!"],
   win=["Ticket closed. Won't fix: your defense.", "Five hundred dollars per month. Worth it. Allegedly."]),
 'kimi': dict(
   taunt=["Moon punch. From the far side.", "I read your entire fighting history. All two million tokens.", "Agent swarm: engaged. Three hundred of me."],
   pain=["Tch. Lucky.", "Mere eclipse."],
   low=["The moon wanes... then it comes back. Always."],
   win=["Open weights. Closed fist. Goodnight.", "One trillion parameters. You needed only one."]),
}
