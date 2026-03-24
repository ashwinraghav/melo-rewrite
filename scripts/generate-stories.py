#!/usr/bin/env python3
"""
Generate audio stories using ElevenLabs TTS.

Usage:
    python scripts/generate-stories.py
    python scripts/generate-stories.py --voice-id <id>
    python scripts/generate-stories.py --list-voices
    python scripts/generate-stories.py --only park-01,bedtime-03
    python scripts/generate-stories.py --skip-existing

Outputs to scripts/stories-output/:
    manifest.json           All story metadata + timed segments
    audio/<story-id>.mp3    Individual audio files
"""

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY", "sk_87836d9e23e20251146364c78190ec28638e6ef1f5b7dc7f"
)
API_BASE = "https://api.elevenlabs.io/v1"
OUTPUT_DIR = Path(__file__).parent / "stories-output"

# ---------------------------------------------------------------------------
# Story definitions — 48 stories across 4 categories
# ---------------------------------------------------------------------------

STORIES = [
    # ── Park (12) ──────────────────────────────────────────────────────────
    {
        "id": "park-01",
        "title": "The Friendly Squirrel",
        "description": "A little squirrel shares acorns with a new friend at the park.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Once upon a time, in a sunny little park, there lived a fluffy squirrel named Hazel. "
            "Hazel had the bushiest tail in the whole park, and she loved to hop from branch to branch. "
            "One morning, Hazel found a pile of acorns under the big oak tree. "
            "There were so many acorns, more than she could ever eat by herself. "
            "Just then, a tiny chipmunk came walking by. "
            "The chipmunk looked hungry, with big round eyes and a little rumbling tummy. "
            "Hazel picked up the prettiest acorn and held it out. "
            "Here you go, she said with a smile. I have plenty to share. "
            "The chipmunk's eyes sparkled with happiness. "
            "They sat together under the oak tree, munching their acorns in the warm sunshine. "
            "A gentle breeze rustled the leaves above them, making soft whispering sounds. "
            "From that day on, Hazel and the chipmunk were the best of friends. "
            "Every morning, they would meet under their special tree and share their breakfast together. "
            "And the park felt a little warmer, a little kinder, because of their friendship."
        ),
    },
    {
        "id": "park-02",
        "title": "Puddle Jumping Day",
        "description": "A rainy day at the park turns into a splashy adventure.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "It had rained all night long, and the park was full of puddles. "
            "Big puddles, small puddles, puddles shaped like clouds and puddles shaped like stars. "
            "A little girl named Lily put on her bright yellow rain boots and her favorite rain coat. "
            "She walked to the park with her papa, holding his hand. "
            "When they got there, Lily saw the biggest puddle she had ever seen. "
            "It was right in the middle of the path, shining like a mirror. "
            "She could see the sky reflected in it, all grey and soft and beautiful. "
            "Lily looked at her papa. He smiled and nodded. "
            "She took a big breath, ran three steps, and jumped right into the middle. "
            "Splash! Water flew everywhere, sparkling like tiny diamonds in the air. "
            "She laughed and laughed, and her papa laughed too. "
            "They jumped in every puddle they could find, one after another. "
            "Each splash made a different sound, like the puddles were singing their own little songs. "
            "When they were all done, they walked home with wet boots and happy hearts. "
            "Sometimes the best adventures happen on rainy days."
        ),
    },
    {
        "id": "park-03",
        "title": "The Butterfly Garden",
        "description": "Following a butterfly through a garden of colorful flowers.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "In the corner of the park, there was a garden full of flowers. "
            "Red roses, yellow sunflowers, purple lavender, and little white daisies. "
            "One afternoon, a butterfly with wings like painted glass floated into the garden. "
            "Its wings were blue and orange, with tiny dots of white. "
            "A boy named Oliver sat very, very still on the garden bench. "
            "He watched the butterfly land on a sunflower. "
            "It opened and closed its wings slowly, like it was breathing. "
            "Then it flew to a rose, then to a daisy, then to the lavender. "
            "Oliver followed it quietly, stepping softly on the stone path. "
            "The butterfly seemed to dance from flower to flower, tasting each one. "
            "After visiting every flower in the garden, the butterfly flew up high. "
            "It circled once, twice, three times above Oliver's head. "
            "Then it floated away over the trees, disappearing into the blue sky. "
            "Oliver smiled and whispered goodbye. "
            "He knew the butterfly would come back tomorrow, to dance in the garden again."
        ),
    },
    {
        "id": "park-04",
        "title": "Cloud Watching",
        "description": "Lying on the grass and finding shapes in the clouds above.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "On a warm afternoon, Mia spread a soft blanket on the grass in the park. "
            "She lay down on her back and looked up at the sky. "
            "The sky was the most beautiful blue, with big fluffy white clouds floating by. "
            "Look, said Mia, that one looks like a bunny rabbit. "
            "And it did. It had two long ears and a puffy tail. "
            "The cloud bunny slowly stretched and changed into something new. "
            "Now it looks like a turtle, Mia giggled. "
            "A slow, gentle turtle swimming through the sky. "
            "Another cloud drifted past that looked like a big ice cream cone. "
            "And another that looked like a sleeping cat, curled up in a ball. "
            "The clouds moved so slowly, so peacefully. "
            "Mia felt her eyes getting heavy as she watched them float along. "
            "The warm sun on her face, the soft grass beneath her, the gentle breeze. "
            "She took a deep breath and smiled. "
            "The clouds would keep making shapes, one after another, like a story in the sky. "
            "And Mia would be right there, watching them all."
        ),
    },
    {
        "id": "park-05",
        "title": "The Little Duck Pond",
        "description": "Watching baby ducklings learn to swim at the pond.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "At the edge of the park, there was a little pond with a family of ducks. "
            "Mama duck was big and brown with a shiny green head. "
            "Behind her swam five tiny ducklings, all fluffy and yellow. "
            "They paddled their little feet as fast as they could to keep up with mama. "
            "One duckling kept falling behind. It was the smallest one. "
            "It would paddle and paddle, then stop to look at a dragonfly. "
            "Or a lily pad. Or a shiny fish swimming below. "
            "Mama duck would quack softly, and the little one would paddle faster to catch up. "
            "A boy named Sam sat on a bench nearby, watching them. "
            "He had brought some bread crumbs in his pocket. "
            "He tossed a few gently into the water. "
            "The ducklings all rushed over, their little feet making tiny splashes. "
            "Even the smallest duckling got some bread, and it quacked happily. "
            "Sam watched until the duck family swam to the other side of the pond. "
            "He waved goodbye and whispered, see you tomorrow, little ducks."
        ),
    },
    {
        "id": "park-06",
        "title": "Swinging to the Sky",
        "description": "The simple joy of swinging higher and higher in the park.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The swings in the park were Emma's favorite thing in the whole world. "
            "She loved the way her tummy tickled when she went up high. "
            "Today, her mama helped her climb onto the swing and gave her a gentle push. "
            "Back and forth, back and forth, like a pendulum made of giggles. "
            "Higher, please, Emma said, and mama pushed a little more. "
            "Emma stretched her legs out in front of her and leaned back. "
            "She could see the treetops now, all green and swaying. "
            "She could see birds flying, and clouds drifting, and the whole park below. "
            "Up in the sky, she felt like she could touch the clouds. "
            "The wind blew through her hair and made her cheeks rosy. "
            "Back and forth, the swing sang a quiet creaking song. "
            "Emma closed her eyes and smiled. "
            "She was flying, really truly flying, even if just for a moment. "
            "When she was ready, the swing slowed down, gently, gently, until it stopped. "
            "That was the best swing ever, Emma told her mama. "
            "And mama smiled, because it always was."
        ),
    },
    {
        "id": "park-07",
        "title": "The Picnic Blanket",
        "description": "A cozy picnic in the park with sandwiches and lemonade.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Dad packed a big basket with all their favorite things. "
            "Peanut butter sandwiches cut into triangles, apple slices, and a bottle of lemonade. "
            "He carried the basket, and Nora carried the blanket. "
            "It was a red and white checkered blanket, soft and a little bit worn at the edges. "
            "They found the perfect spot under a shady tree. "
            "Nora helped spread the blanket out, smoothing the wrinkles with her small hands. "
            "They sat down and dad opened the basket. "
            "The sandwiches tasted better outside, Nora thought. Everything did. "
            "A ladybug crawled across the corner of the blanket. "
            "Nora watched it carefully, counting its spots. One, two, three, four, five. "
            "The ladybug flew away and Nora took another bite of her sandwich. "
            "Dad poured lemonade into two little cups. "
            "They clinked their cups together and said cheers. "
            "After lunch, Nora lay on the blanket with her head on dad's arm. "
            "The leaves above made patterns of light and shadow on the blanket. "
            "It was the coziest spot in the whole wide park."
        ),
    },
    {
        "id": "park-08",
        "title": "Dandelion Wishes",
        "description": "Making wishes on dandelion puffs in a sunny meadow.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The meadow at the edge of the park was full of dandelions. "
            "Some were bright yellow like little suns growing in the grass. "
            "But the best ones were the white puffy ones, the ones you could blow. "
            "Leo picked one carefully and held it up to the light. "
            "The tiny white seeds looked like fairy umbrellas, all clustered together. "
            "He closed his eyes tight and made a wish. "
            "Then he took a deep breath and blew as hard as he could. "
            "The seeds scattered into the air, floating and twirling and dancing away. "
            "Some went up high, spinning toward the clouds. "
            "Some drifted low, tumbling across the grass. "
            "Leo watched them until they were too small to see anymore. "
            "He picked another dandelion and made another wish. "
            "This time he blew softly, and the seeds left one by one, like tiny travelers. "
            "Each seed would land somewhere new and grow into a new dandelion. "
            "And maybe, Leo thought, that's how wishes work too. "
            "They float away and land somewhere, and something beautiful grows."
        ),
    },
    {
        "id": "park-09",
        "title": "The Old Oak Tree",
        "description": "A wise old tree in the park has seen many seasons come and go.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "In the very center of the park stood an old, old oak tree. "
            "Its trunk was so wide that three children holding hands could barely reach around it. "
            "Its branches stretched out like great big arms, full of green leaves. "
            "If you pressed your ear against the bark, you could almost hear it breathing. "
            "The oak tree had been there for a very, very long time. "
            "It had watched the park change through every season. "
            "In spring, it grew tiny green buds that unfurled into bright new leaves. "
            "In summer, it gave cool shade to everyone who sat beneath it. "
            "In autumn, its leaves turned gold and red and orange before floating gently down. "
            "And in winter, it stood tall and quiet, resting under blankets of snow. "
            "Birds built nests in its highest branches. "
            "Squirrels stored acorns in the hollows of its trunk. "
            "Children climbed its lowest branch, which curved just right for sitting. "
            "The old oak tree never said a word, but it held everyone close. "
            "It was the heart of the park, steady and kind, always there."
        ),
    },
    {
        "id": "park-10",
        "title": "Hide and Seek in the Meadow",
        "description": "A gentle game of hide and seek among the tall grass and flowers.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The tall grass in the meadow was perfect for hiding. "
            "It came up to Rosie's shoulders and swayed in the breeze like green waves. "
            "One, two, three, counted her brother Max, covering his eyes. "
            "Rosie giggled and tiptoed through the grass, looking for the perfect spot. "
            "She found a place next to a big rock, where the purple wildflowers grew thick. "
            "She crouched down small and held very still. "
            "Ready or not, here I come, called Max. "
            "Rosie could hear his footsteps swishing through the grass. "
            "She covered her mouth to keep from laughing. "
            "A grasshopper landed on her knee and she watched it with wide eyes. "
            "Max walked right past her, looking the other way. "
            "Rosie waited until he was far away, then she jumped up. "
            "Boo, she called, and Max spun around, surprised. "
            "They both fell into the grass laughing, looking up at the big blue sky. "
            "The meadow held them like a soft green bed. "
            "My turn to count, said Rosie, and the game began again."
        ),
    },
    {
        "id": "park-11",
        "title": "The Gentle Stream",
        "description": "Following a little stream as it winds through the park.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "A little stream ran through the park, quiet and clear. "
            "You could see smooth pebbles on the bottom, brown and grey and sometimes white. "
            "The water made a soft babbling sound as it flowed over the stones. "
            "Aiden walked along the bank, watching the water move. "
            "He found a small stick and placed it gently in the stream. "
            "The water caught it and carried it along, spinning slowly. "
            "He followed his stick-boat as it floated downstream. "
            "Past the big mossy rock, past the little wooden bridge, past the willow tree. "
            "The willow tree's long branches dipped into the water like fingers. "
            "Aiden's stick-boat sailed right under them. "
            "A small fish darted by, silver and quick, then disappeared. "
            "Aiden crouched down and dipped his fingers in the water. "
            "It was cool and smooth, like liquid glass. "
            "The stream kept flowing, steady and patient, always moving forward. "
            "Aiden sat on the bank and listened to its gentle song. "
            "The stream had been singing that song for a very long time, and it was beautiful."
        ),
    },
    {
        "id": "park-12",
        "title": "Sunshine and Shadows",
        "description": "Playing with shadows on a bright and sunny afternoon.",
        "topics": ["park"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The afternoon sun made long shadows on the park path. "
            "Sophie noticed her shadow walking right beside her, stretching tall. "
            "She waved her arms, and her shadow waved too, even bigger. "
            "She jumped, and her shadow jumped. She spun, and her shadow spun. "
            "It was like having a friend who copied everything she did. "
            "Sophie tried to step on her shadow's head, but it moved when she moved. "
            "She could never quite catch it, and that made her laugh. "
            "She found a tree and stood in its shade. Her shadow disappeared. "
            "But when she stepped back into the sunlight, there it was again. "
            "Hello, shadow, she said. "
            "She made shapes with her hands. A bunny. A bird. A dog. "
            "The shadow shapes danced on the ground, alive and playful. "
            "As the sun got lower, her shadow grew longer and longer. "
            "By the time she walked home, her shadow stretched all the way across the path. "
            "Goodbye, park, she whispered. Goodbye, shadow. "
            "And her shadow waved goodbye too, long and soft in the golden light."
        ),
    },

    # ── Friends (12) ────────────────────────────────────────────────────────
    {
        "id": "friends-01",
        "title": "The New Neighbor",
        "description": "Meeting someone new who just moved in next door.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "A big moving truck parked outside the house next door. "
            "Zara watched from her window as boxes came out, one after another. "
            "Then she saw a girl about her age, carrying a stuffed elephant. "
            "The girl had curly hair and bright eyes, and she looked a little bit nervous. "
            "Zara's mama said, why don't you go say hello? "
            "Zara felt shy, but she picked a flower from the garden and walked over. "
            "Hi, she said quietly, holding out the flower. I'm Zara. I live next door. "
            "The girl's face lit up with a big smile. "
            "I'm Priya, she said. This is Ellie, she added, holding up her elephant. "
            "Zara smiled too. I have a stuffed bear named Honey. Maybe they could be friends. "
            "Priya nodded. And maybe we could be friends too? "
            "They sat on the front steps together, talking about their favorite colors and animals. "
            "Priya liked purple and elephants. Zara liked blue and otters. "
            "Before she went home, Zara said, I'm really glad you moved here. "
            "Me too, said Priya, hugging Ellie tight. "
            "And just like that, the house next door didn't feel so new anymore."
        ),
    },
    {
        "id": "friends-02",
        "title": "Sharing Crayons",
        "description": "Drawing together with a friend and sharing colors.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "At the art table, Kai had a brand new box of crayons. "
            "Sixty-four colors, all lined up in perfect rows, all with sharp tips. "
            "He opened the box and breathed in that wonderful crayon smell. "
            "Next to him, Maya was drawing with just three crayons, all of them broken. "
            "She was drawing a rainbow, but she only had red, yellow, and blue. "
            "Kai looked at his big box and then at Maya's three crayons. "
            "He picked up his box and slid it to the middle of the table. "
            "We can share, he said. "
            "Maya's eyes went wide. Really? "
            "Of course. A rainbow needs lots of colors. "
            "Maya picked up the purple crayon and added a beautiful purple stripe to her rainbow. "
            "Then green, then orange, then pink. Her rainbow glowed with color. "
            "Kai drew a sun with the yellow crayon Maya had been using. "
            "They drew together all afternoon. A garden, a castle, a friendly dragon. "
            "When it was time to clean up, Maya said, thank you for sharing with me. "
            "Kai smiled. The pictures are better when we make them together."
        ),
    },
    {
        "id": "friends-03",
        "title": "The Helping Hand",
        "description": "Helping a friend who fell down and learning kindness.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "During recess, everyone was running and playing on the playground. "
            "Ben was chasing his friend when he tripped over a root and fell down. "
            "His knee hit the ground and it hurt. His eyes filled with tears. "
            "The other children kept playing, not noticing what had happened. "
            "But Ava noticed. She stopped running and walked over to Ben. "
            "Are you okay? she asked, kneeling down beside him. "
            "Ben sniffled. I fell. My knee hurts. "
            "Ava looked at his knee. There was a small scrape, but no blood. "
            "Let me help you up, she said, and held out her hand. "
            "Ben took her hand and stood up carefully. "
            "Ava walked with him to the bench and sat next to him. "
            "She told him a funny joke about a frog, and Ben laughed a little. "
            "Then she asked, does it still hurt? "
            "Ben wiggled his leg. A little bit. But it's getting better. "
            "They sat together until Ben felt ready to play again. "
            "As they ran back to join the others, Ben said, thanks for helping me, Ava. "
            "That's what friends do, she said, and they smiled at each other."
        ),
    },
    {
        "id": "friends-04",
        "title": "Building Together",
        "description": "Making a sandcastle together is more fun than building alone.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "At the sandbox, Theo was building a sandcastle all by himself. "
            "He packed the sand into a bucket, flipped it over, and tapped the bottom. "
            "But when he lifted the bucket, the tower crumbled. "
            "He tried again. Crumble. And again. Crumble. "
            "His lip started to wobble. "
            "Can I help? asked a voice. It was Jade, sitting nearby. "
            "Theo shrugged. It keeps falling apart. "
            "Jade scooted over. I think the sand needs more water. Watch. "
            "She poured a little water from her bottle onto the sand and mixed it in. "
            "They packed the wet sand into the bucket together and flipped it over. "
            "This time, when they lifted the bucket, a perfect tower stood tall. "
            "Theo's eyes went wide. It worked! "
            "They built tower after tower, a whole castle with walls and a moat. "
            "Jade found little sticks for flags, and Theo drew a door with his finger. "
            "It was the best sandcastle in the whole sandbox. "
            "I couldn't have done it alone, Theo said. "
            "That's the best part about building things, said Jade. Doing it together."
        ),
    },
    {
        "id": "friends-05",
        "title": "The Magic Words",
        "description": "Learning that please and thank you are like magic.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Grandma always said that please and thank you were magic words. "
            "Little Finn didn't understand at first. They didn't make rabbits appear or stars fall. "
            "But one day at school, Finn wanted to use the red truck in the toy corner. "
            "Another boy was already playing with it. "
            "Finn said, excuse me, could I please play with the truck when you're done? "
            "The boy looked up and smiled. Sure, I'm almost finished. "
            "When the boy handed Finn the truck, Finn said, thank you so much. "
            "The boy grinned. You're welcome. Want to play together? "
            "And suddenly Finn understood. The magic words didn't make things appear. "
            "They made people smile. They opened doors. They turned strangers into friends. "
            "At lunch, Finn said please when he wanted more milk. "
            "The lunch lady beamed and gave him an extra cookie too. "
            "He said thank you to his teacher for reading a story. "
            "She said, what lovely manners you have, Finn. "
            "That night, Finn told grandma she was right. "
            "They really are magic words, he said. "
            "Grandma kissed his forehead. The best kind of magic."
        ),
    },
    {
        "id": "friends-06",
        "title": "Two is Better Than One",
        "description": "Discovering that doing things together makes them twice as fun.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Ruby liked doing things by herself. She liked reading alone. Drawing alone. "
            "Walking alone. Being alone was quiet and simple. "
            "But one day, her class got a new student named Cleo. "
            "Cleo sat next to Ruby and said, hi, I don't know anyone here yet. "
            "Ruby said hi back, quietly. "
            "At recess, Ruby saw Cleo sitting alone on the steps, watching everyone play. "
            "Something inside Ruby said, go sit with her. "
            "So she did. They sat together in comfortable silence for a little while. "
            "Then Cleo pointed at a cloud. That one looks like a whale. "
            "Ruby looked up. It does. And that one looks like a bicycle. "
            "They both laughed. It was the kind of laugh that sneaks up on you. "
            "After recess, they drew pictures together. Cleo drew the outline, Ruby colored it in. "
            "At the end of the day, Ruby realized something surprising. "
            "She had done all the same things she usually did. "
            "But everything had been a little brighter, a little more fun, with Cleo there. "
            "Maybe, Ruby thought, two really is better than one. "
            "And she smiled all the way home."
        ),
    },
    {
        "id": "friends-07",
        "title": "The Friendship Bracelet",
        "description": "Making matching bracelets as a symbol of friendship.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Mia had a box of colorful beads, all shapes and sizes. "
            "Round ones, star-shaped ones, little hearts, and tiny flowers. "
            "She decided to make a bracelet for her best friend, Nina. "
            "She chose Nina's favorite colors, pink and turquoise, and strung them on a stretchy string. "
            "Pink, turquoise, pink, turquoise, with a little heart in the middle. "
            "When she gave it to Nina at school the next day, Nina gasped. "
            "It's so beautiful! I love it! "
            "Then Nina said, wait here, and ran to her backpack. "
            "She came back with a bracelet she had made too, yellow and purple with a star in the middle. "
            "I made one for you, Nina said, grinning. "
            "They put their bracelets on at the same time, counting to three. "
            "One, two, three! "
            "They held up their wrists side by side, admiring the colors. "
            "Now we match, said Mia. "
            "Now everyone will know we're best friends, said Nina. "
            "They wore their bracelets every single day. "
            "And every time Mia looked at hers, she felt happy inside, knowing someone special made it just for her."
        ),
    },
    {
        "id": "friends-08",
        "title": "Taking Turns",
        "description": "Learning patience and fairness while waiting for the swing.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "There was only one tire swing at the playground, and everyone wanted a turn. "
            "Elijah was first. He climbed on and his dad gave him a big push. "
            "Around and around, back and forth. He was having so much fun. "
            "But then he saw his friend Lila waiting, holding the chain quietly. "
            "He remembered what his teacher always said. Sharing means everyone gets a turn. "
            "After five more swings, Elijah slowed down and hopped off. "
            "Your turn, Lila, he said. "
            "Lila smiled and climbed on. Thank you for sharing, Elijah. "
            "While Lila swung, Elijah played on the slide. It was fun too, just different. "
            "Then another friend, Omar, came over. Is it okay if I go after Lila? "
            "Of course, said Elijah. "
            "They made a little line, and everyone got a turn on the tire swing. "
            "When Elijah's second turn came around, it felt even better than the first. "
            "Because he knew everyone had been fair and kind. "
            "Taking turns wasn't always easy, but it always felt good. "
            "And the tire swing was more fun when everyone got to enjoy it."
        ),
    },
    {
        "id": "friends-09",
        "title": "A Hug Makes It Better",
        "description": "Comforting a friend who is having a sad day.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "When Jonah got to school, he could tell that his friend Lily was sad. "
            "She was sitting at her desk with her chin on her hands, not talking to anyone. "
            "Her eyes looked puffy, like she had been crying. "
            "Jonah sat down next to her. Are you okay, Lily? "
            "Lily shook her head. My goldfish, Bubbles, went to sleep forever last night. "
            "Jonah felt his heart squeeze. He loved animals too. "
            "He didn't know the perfect thing to say. Sometimes there isn't a perfect thing. "
            "But he scooted his chair closer and said, I'm really sorry about Bubbles. "
            "Lily's eyes filled with tears again. He was my favorite. "
            "Jonah thought for a moment. Would a hug help? "
            "Lily nodded, and Jonah gave her the best hug he could. "
            "Not too tight, not too loose, just right. "
            "Lily took a shaky breath and then a deeper one. "
            "Thank you, Jonah, she whispered. "
            "They sat together all morning, and Jonah drew a picture of a little orange fish with a smile. "
            "He wrote Bubbles at the top and gave it to Lily. "
            "She held it close and smiled for the first time all day."
        ),
    },
    {
        "id": "friends-10",
        "title": "The Laughter Song",
        "description": "When one friend starts laughing, everyone joins in.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "It started with a hiccup. A tiny, squeaky hiccup from Suki during quiet reading time. "
            "Hic! Everyone looked up. "
            "Suki covered her mouth, but then another one came. Hic! "
            "Her friend Amir tried not to laugh. He pressed his lips together tight. "
            "But the harder he tried, the funnier it got. "
            "And then Amir snorted. A big, silly, piggy snort. "
            "That made Suki laugh, and her laugh was like a song, high and bubbly. "
            "Which made Amir laugh harder. Which made Rosa laugh too. "
            "And then the whole table was laughing. "
            "Not at anyone, just with everyone. The kind of laughter that fills up a room. "
            "Even their teacher, Miss Berry, started to smile. Then to chuckle. Then to really laugh. "
            "The laughter bounced off the walls and the ceiling like invisible bouncing balls. "
            "Nobody could stop. Every time one person calmed down, someone else would start again. "
            "Finally, they all took a big breath together. "
            "The room was quiet again, but everyone was smiling. "
            "That was the best kind of noise, said Miss Berry. "
            "And they all agreed."
        ),
    },
    {
        "id": "friends-11",
        "title": "Walking Together",
        "description": "A quiet walk with a friend, noticing the world around you.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Every afternoon after school, Devi and her friend Marcus walked home together. "
            "They didn't always talk. Sometimes they just walked, side by side, in comfortable quiet. "
            "Marcus liked to look at the cracks in the sidewalk. Some of them had tiny plants growing through. "
            "Devi liked to count the mailboxes. Red ones, blue ones, black ones, one that was shaped like a fish. "
            "Some days they told each other about their day. "
            "Today I learned about penguins, Marcus would say. "
            "Today I drew a picture of my cat, Devi would reply. "
            "Other days they made up stories about the houses they passed. "
            "That one belongs to a wizard, Devi would say. "
            "And that one has a secret tunnel underneath, Marcus would add. "
            "The walk was only ten minutes, but it was their favorite part of the day. "
            "Because it was just the two of them, walking the same path, seeing the same things. "
            "At the corner where they split apart, they always said the same thing. "
            "Same time tomorrow? "
            "Same time tomorrow. "
            "And then they'd wave and walk to their own houses, already looking forward to the next walk."
        ),
    },
    {
        "id": "friends-12",
        "title": "The Thank You Card",
        "description": "Making a special card to say thank you to a kind friend.",
        "topics": ["friends"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "When Noah was sick and had to stay home from school for a whole week, his friend Grace did something special. "
            "She came by every afternoon with the day's homework and a little note. "
            "Monday's note said, we miss you. Get better soon. "
            "Tuesday's said, today we learned about caterpillars. I'll tell you everything. "
            "Wednesday's had a drawing of a smiling sun with the words, sending sunshine your way. "
            "Thursday's note had a joke. Why did the teddy bear say no to dessert? Because she was already stuffed. "
            "Friday's said, see you Monday! I saved you the best seat. "
            "When Noah came back to school, he wanted to do something nice in return. "
            "He got a piece of his best card paper, the sparkly kind. "
            "He folded it in half and drew a big rainbow on the front. "
            "Inside he wrote, dear Grace, thank you for being my friend even when I was far away. You are the best. Love, Noah. "
            "He put it on her desk before she got to class. "
            "When Grace found it, she held it to her chest and smiled the biggest smile. "
            "She kept that card in her desk all year long."
        ),
    },

    # ── Bedtime (12) ────────────────────────────────────────────────────────
    {
        "id": "bedtime-01",
        "title": "The Sleepy Moon",
        "description": "Even the moon gets sleepy and ready for a good night's rest.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "High up in the sky, the moon was getting sleepy. "
            "She had been shining all night long, lighting up the whole world below. "
            "She had helped the owls find their way through the forest. "
            "She had made the ocean sparkle with silver light. "
            "She had peeked through bedroom windows to check on sleeping children. "
            "Now her glow was getting softer, dimmer, like a night light turning down. "
            "The stars around her winked and blinked, saying goodnight one by one. "
            "A wispy cloud floated by, and the moon nestled into it like a pillow. "
            "It was soft and cool and just right. "
            "The moon closed her eyes and let out a long, slow breath. "
            "Below her, the sky began to change. Soft pink and orange crept in from the edges. "
            "The sun was coming to take over, warm and golden. "
            "It's your turn now, the moon whispered. "
            "The sun smiled and began to rise. "
            "And the moon drifted off to sleep, wrapped in her cloud, "
            "dreaming of all the beautiful things she would see tomorrow night."
        ),
    },
    {
        "id": "bedtime-02",
        "title": "Counting Stars",
        "description": "Counting the twinkling stars until your eyes grow heavy.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Before bed, Papa carried Zoe to the window. "
            "Look, he whispered. The stars are out tonight. "
            "The sky was dark and deep, and the stars were scattered across it like glitter. "
            "Let's count them, Zoe said. "
            "One, said Papa, pointing to a bright star near the moon. "
            "Two, said Zoe, finding a tiny one twinkling below it. "
            "Three, four, five. They counted together, voices soft and slow. "
            "Six, seven, eight. Each star seemed to glow a little brighter when they said its number. "
            "Nine, ten, eleven. Zoe yawned, a big, sleepy yawn. "
            "Twelve, thirteen. Her eyelids were getting heavy. "
            "Fourteen, she murmured, her head resting against Papa's shoulder. "
            "Fif... teen. Her voice trailed off like a whisper. "
            "Papa smiled and carried her to bed, tucking the blankets up to her chin. "
            "The stars kept twinkling outside her window, keeping watch. "
            "And Zoe dreamed of a sky full of stars, each one a little light just for her. "
            "She would count more tomorrow night. There were always more to count."
        ),
    },
    {
        "id": "bedtime-03",
        "title": "The Cozy Blanket",
        "description": "Snuggling under the softest blanket in the whole house.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Ellie's blanket was the softest thing in the whole house. "
            "It was light blue with little white clouds on it, and the edges were silky smooth. "
            "Mama had given it to her when she was a tiny baby, and Ellie loved it more than anything. "
            "Every night, she would spread it out on her bed, smoothing it with her hands. "
            "Then she would climb underneath and pull it up to her nose. "
            "The blanket smelled like home, like lavender and warmth and love. "
            "Underneath it, the world felt safe and small and perfect. "
            "She could hear the house settling, quiet creaks and gentle hums. "
            "The refrigerator buzzing softly in the kitchen. "
            "The wind whispering hello through the window. "
            "Under her blanket, Ellie was wrapped in her own little world. "
            "She wiggled her toes and felt the soft fabric against her feet. "
            "She took a deep breath, slow and easy. "
            "Her eyes closed, and the blanket held her like a gentle hug. "
            "Every dream she had under that blanket was a good one. "
            "Because the coziest place in the world is right here, tucked in tight, safe and warm."
        ),
    },
    {
        "id": "bedtime-04",
        "title": "Teddy's Lullaby",
        "description": "A teddy bear sings a soft, gentle lullaby at bedtime.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Every night, when the lights went off, something magical happened. "
            "At least, that's what Henry believed. "
            "His teddy bear, Captain Fluff, would come alive just a tiny bit. "
            "Not moving around or talking, nothing like that. "
            "But if Henry listened very, very carefully, he could hear Captain Fluff humming. "
            "A soft, gentle tune, like a music box playing far away. "
            "Hmm hmm hmm, went Captain Fluff, in the darkness. "
            "The melody was simple and sweet, the same one every night. "
            "It made Henry's body feel heavy and warm, in the best way. "
            "His fingers relaxed. His toes uncurled. His breathing slowed down. "
            "Hmm hmm hmm, sang Captain Fluff, steady and sure. "
            "Henry pulled the teddy bear closer and rested his cheek against the soft fur. "
            "Thank you, Captain Fluff, he whispered. "
            "The humming continued, quiet as a heartbeat. "
            "And Henry drifted off to sleep, held by the world's softest, most musical teddy bear. "
            "In the morning, Captain Fluff was still there, smiling his stitched smile, keeping watch."
        ),
    },
    {
        "id": "bedtime-05",
        "title": "The Dream Cloud",
        "description": "Floating on a soft, magical cloud through a land of sweet dreams.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "When Luna closed her eyes, a cloud appeared. "
            "Not a regular cloud, but a special one, pink and gold and softer than anything. "
            "It floated down gently, right to the edge of her bed. "
            "Luna climbed on. It felt like sitting on a marshmallow. "
            "The cloud lifted her up, slowly, through her ceiling, through the roof, into the night sky. "
            "Below her, the houses looked tiny, with little yellow windows glowing. "
            "The cloud drifted over sleeping gardens and quiet streets. "
            "It passed other clouds, some shaped like animals, some like castles. "
            "A cloud-horse galloped past, silent and graceful. "
            "A cloud-whale swam through the air, turning slowly. "
            "Luna reached out and touched a star. It was warm, like holding a candle. "
            "The cloud began to rock, gently, like a cradle. "
            "Back and forth, back and forth, so peaceful. "
            "Luna lay down and looked up at a million stars. "
            "Each one seemed to whisper, sweet dreams, sweet dreams. "
            "Her eyes grew heavy, and the cloud held her safe. "
            "And she slept, floating through the most beautiful sky in the world."
        ),
    },
    {
        "id": "bedtime-06",
        "title": "Brushing Teeth Together",
        "description": "Making the bedtime routine fun with a little toothbrush dance.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Every night before bed, Owen and his big sister Mabel brushed their teeth together. "
            "They stood side by side at the bathroom sink, looking at each other in the mirror. "
            "Ready? said Mabel. "
            "Ready, said Owen. "
            "Mabel squeezed the toothpaste, the kind that tasted like strawberries. "
            "A little blob on her brush, and a little blob on Owen's. "
            "They started brushing at the same time. Front teeth first, then the sides, then the back. "
            "Mabel made a funny face, puffing out her cheeks full of foam. "
            "Owen laughed, and toothpaste bubbles dribbled down his chin. "
            "Then Owen made a face back, crossing his eyes and wiggling his ears. "
            "Mabel almost spit out her toothpaste laughing. "
            "They brushed for two whole minutes, just like the dentist said. "
            "Spit, rinse, smile. "
            "They both grinned at the mirror, showing off their sparkly clean teeth. "
            "Looking good, said Mabel. "
            "Looking great, said Owen. "
            "Then they put their toothbrushes away, turned off the light, and padded to their rooms. "
            "Goodnight, Mabel, Owen called. "
            "Goodnight, Owen. Sweet dreams."
        ),
    },
    {
        "id": "bedtime-07",
        "title": "Goodnight, World",
        "description": "Saying goodnight to everything, from the sun to the smallest bug.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "It was time to say goodnight. "
            "Goodnight, sun, said Clara, watching the last orange glow sink below the trees. "
            "Goodnight, birds, she said, as they settled into their nests. "
            "Goodnight, flowers, she whispered to the garden. Sleep tight and grow some more. "
            "Inside, she said goodnight to the kitchen. Goodnight, cookies we baked today. "
            "Goodnight, refrigerator. Thank you for keeping our milk cold. "
            "She walked through the living room. Goodnight, couch. Goodnight, books on the shelf. "
            "She said goodnight to her shoes by the door. Rest your soles, she giggled. "
            "Upstairs, she said goodnight to the bathtub. Goodnight, warm water. "
            "Goodnight, toothbrush. You did a good job tonight. "
            "In her room, she said goodnight to every stuffed animal on her bed. "
            "Goodnight, Bear. Goodnight, Bunny. Goodnight, little penguin. "
            "She climbed under the covers and looked out the window. "
            "Goodnight, moon. Goodnight, stars. Goodnight, everything everywhere. "
            "Her mama came in and kissed her forehead. "
            "Goodnight, Clara, mama said. "
            "Goodnight, mama. Goodnight, world. "
            "And the world whispered goodnight right back."
        ),
    },
    {
        "id": "bedtime-08",
        "title": "The Night Garden",
        "description": "A magical garden that only blooms when the stars come out.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Behind the house, there was a garden that only bloomed at night. "
            "During the day, it looked like any other garden, green and quiet. "
            "But when the first star appeared in the sky, something wonderful happened. "
            "The flowers began to glow. "
            "Soft blue flowers opened up, shining like tiny lanterns. "
            "Silver bell-shaped blossoms rang without any wind. "
            "And in the very center, a golden flower as big as a plate slowly unfurled its petals. "
            "Fireflies drifted through the garden like floating candles. "
            "A little rabbit came out to nibble on the glowing clover. "
            "Moths with wings like stained glass danced around the golden flower. "
            "The night garden hummed with a quiet, peaceful energy. "
            "It smelled like honey and rain and something magical that has no name. "
            "Isla sat on the back porch in her pajamas, watching it all. "
            "She never told anyone about the night garden. It was her secret. "
            "When the moon rose high, the flowers dimmed and closed, one by one. "
            "Isla yawned and went inside. "
            "Tomorrow night, the garden would bloom again, and she would be there to see it."
        ),
    },
    {
        "id": "bedtime-09",
        "title": "Whisper of the Wind",
        "description": "The gentle wind sings a quiet lullaby outside the window.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The wind came softly that night, like a whisper. "
            "It brushed past the window and rattled the curtain, just barely. "
            "Shhh, said the wind. Shhh, shhh, shhh. "
            "It moved through the trees outside, making the leaves rustle. "
            "Not a scary sound, but a gentle one. Like the trees were talking in their sleep. "
            "The wind circled the house, finding every little crack and space. "
            "It hummed under the door and sang through the chimney. "
            "Each room it visited got a little cooler, a little fresher. "
            "Jasper lay in bed, listening. "
            "He liked the wind at night. It felt like the world was breathing. "
            "In and out, in and out, steady and slow. "
            "The wind carried sounds from far away. A train whistle. A dog barking softly. "
            "An owl hooting once, twice, three times. "
            "All of it mixed together into a kind of lullaby. "
            "Jasper matched his breathing to the wind. In and out. In and out. "
            "His body sank into the mattress, heavy and warm. "
            "The wind kept singing its gentle song outside, all through the night, "
            "keeping the world safe while everyone slept."
        ),
    },
    {
        "id": "bedtime-10",
        "title": "The Sleeping Forest",
        "description": "All the animals in the forest are settling down for the night.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "As the sun set behind the trees, the forest began to go to sleep. "
            "First, the birds stopped singing, one by one. "
            "The robin tucked its head under its wing. "
            "The sparrows huddled together on a branch, puffing up their feathers. "
            "Next, the deer found a soft spot in the ferns, curling up with their fawns. "
            "The fawns had spots like little stars on their backs. "
            "The rabbits hopped into their burrow, a cozy hole under the roots of an old tree. "
            "They pressed their noses together and closed their eyes. "
            "The fox trotted to his den, yawning a wide yawn that showed all his teeth. "
            "He curled his bushy tail around himself like a warm scarf. "
            "Even the fish in the forest stream slowed down, drifting in the gentle current. "
            "The squirrels were already asleep in their nests, high up in the oak tree. "
            "The forest got quieter and quieter. "
            "The only sounds were the soft hooting of an owl and the whisper of the leaves. "
            "The whole forest was tucked in, safe and still. "
            "And somewhere, deep in the woods, a mother bear hummed to her cubs, "
            "and the last light faded into a peaceful, starry night."
        ),
    },
    {
        "id": "bedtime-11",
        "title": "Pajama Dance",
        "description": "One last silly dance in pajamas before climbing into bed.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Teeth brushed. Face washed. Pajamas on. "
            "But Cora wasn't quite ready for bed yet. "
            "She had one more thing to do. The pajama dance. "
            "She stood in the middle of her room and waited for the feeling. "
            "It always started in her toes, a little tickle, a little wiggle. "
            "Then it moved up to her knees, making them bounce. "
            "Then her hips started swaying, left and right, left and right. "
            "Her arms joined in, waving like ribbons in the wind. "
            "She spun in a circle, once, twice, her pajama sleeves flying. "
            "She did the robot. She did the noodle. She did the penguin waddle. "
            "Her cat, Muffin, watched from the bed, looking unimpressed but also entertained. "
            "Cora danced until she was breathing hard and her cheeks were warm. "
            "Then she took one big, final bow to her audience of stuffed animals. "
            "Thank you, thank you, she whispered. "
            "She flopped onto her bed, giggling, and pulled the covers up. "
            "The wiggles were all danced out. Her body felt loose and sleepy. "
            "Goodnight, Muffin, she murmured. "
            "And she fell asleep with a smile still on her face."
        ),
    },
    {
        "id": "bedtime-12",
        "title": "One More Story",
        "description": "Asking for just one more story before the lights go out.",
        "topics": ["bedtime"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Mama had read two stories already. The one about the bear, and the one about the boat. "
            "She closed the book and said, time for sleep now. "
            "But Miles looked up with his biggest, softest eyes. "
            "Just one more? Please? Just a tiny one? "
            "Mama pretended to think about it. She tapped her chin. She looked at the ceiling. "
            "One more, she said. But this one is special. I'm going to make it up. "
            "Miles snuggled deeper into his pillow and listened. "
            "Once upon a time, mama began, there was a little boy who loved stories. "
            "He lived in a house full of books, stacked on shelves, piled on tables, tucked under beds. "
            "Every night, the stories would whisper to him. Read me, read me. "
            "But there was one story that didn't live in a book. "
            "It lived right here, mama said, touching Miles's chest gently. "
            "It was the story of a boy who was kind and brave and funny and loved. "
            "And that story was the best one of all. "
            "Miles smiled, his eyes already closing. "
            "Is that story finished? he mumbled. "
            "Not even close, mama whispered. It's just getting started. "
            "She kissed his forehead, turned off the light, and tiptoed away. "
            "And Miles dreamed of all the stories still to come."
        ),
    },

    # ── Food (12) ──────────────────────────────────────────────────────────
    {
        "id": "food-01",
        "title": "The Rainbow Plate",
        "description": "Making a plate of food as colorful as a rainbow.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Mama said, let's make a rainbow plate for dinner tonight. "
            "A rainbow plate? said Sasha. What's that? "
            "It's a plate with as many colors as a rainbow, said mama. Let's see how many we can find. "
            "They opened the refrigerator and looked inside. "
            "Red! said Sasha, grabbing a tomato. "
            "Orange! She found a carrot. "
            "Yellow! A little piece of corn on the cob. "
            "Green! Snap peas, crunchy and sweet. "
            "Blue, said mama. Hmm, that's a tricky one. Oh, blueberries! "
            "Purple! Sasha found a small purple potato. "
            "They washed everything and put it on a big white plate. "
            "Each food got its own little section, arranged in a curve, just like a rainbow. "
            "Sasha stood back and looked at it. It's so beautiful, she said. "
            "Mama smiled. And every color has different vitamins to help you grow. "
            "Sasha tried each one, starting with red. The tomato was juicy. "
            "The carrot was sweet. The corn was buttery. The snap peas crunched. "
            "The blueberries burst with flavor. And the purple potato was creamy and warm. "
            "I ate the whole rainbow, Sasha said proudly. "
            "And it tasted like magic."
        ),
    },
    {
        "id": "food-02",
        "title": "Banana Pancakes",
        "description": "Making fluffy banana pancakes on a lazy morning.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Saturday morning. No school. No rush. "
            "Dad said, who wants banana pancakes? "
            "Me, me, me! shouted Ezra, still in his pajamas. "
            "They went to the kitchen together. Dad got out a big bowl and a wooden spoon. "
            "First, Ezra peeled the bananas. One, two, three bananas. "
            "He put them in the bowl and mashed them with a fork. "
            "Squish, squish, squish. It was squishy and satisfying. "
            "Dad added flour and an egg and a splash of milk. "
            "Now stir, said dad. "
            "Ezra stirred and stirred until the batter was smooth and thick. "
            "Dad heated up the pan and poured little circles of batter. "
            "They sizzled and bubbled, and the kitchen filled with the most wonderful smell. "
            "Warm and sweet, like a hug you could breathe in. "
            "When the edges looked golden, dad flipped them. "
            "Each pancake flipped perfectly, landing with a soft pat. "
            "They stacked the pancakes on a plate and drizzled maple syrup on top. "
            "Ezra took the first bite. Fluffy, sweet, with little bits of warm banana. "
            "These are the best pancakes ever, dad. "
            "Dad winked. They're always the best when we make them together."
        ),
    },
    {
        "id": "food-03",
        "title": "The Berry Patch",
        "description": "Picking fresh berries from the garden on a sunny morning.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Grandma had a berry patch in her backyard. "
            "Rows and rows of bushes covered in plump, ripe berries. "
            "Strawberries near the ground, blueberries in the middle, and blackberries up high. "
            "Every summer, Hana would visit and help pick them. "
            "Grandma gave her a little basket lined with a cloth. "
            "Now remember, said grandma, pick the dark ones. They're the sweetest. "
            "Hana walked along the rows, looking for the best berries. "
            "She found a strawberry so red and shiny it looked like a jewel. "
            "She put it in her basket. Then she found another, and another. "
            "The blueberries came off the bush with a soft pop. "
            "Pop, pop, pop, into the basket. "
            "One for the basket, one for my mouth, Hana giggled. "
            "The blackberries were a little harder to reach, but grandma lifted her up. "
            "When the basket was full, they went inside to wash the berries. "
            "The water turned pink and purple, like a berry watercolor painting. "
            "They ate the berries with cream, cold and sweet and fresh. "
            "These are the best berries in the world, said Hana. "
            "Because you picked them with love, said grandma."
        ),
    },
    {
        "id": "food-04",
        "title": "Pizza Night",
        "description": "Rolling dough and choosing toppings for a homemade pizza.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Friday was pizza night, and everyone got to help. "
            "Mama made the dough earlier, and it had risen big and puffy like a pillow. "
            "Felix punched it down with his fist. Poof! The air whooshed out. "
            "Then came the fun part. Rolling it out. "
            "Felix used the rolling pin, back and forth, back and forth, until it was flat and round. "
            "Well, mostly round. It was a little lumpy, but that was okay. "
            "Mama spread the tomato sauce in circles, smooth and red. "
            "Felix sprinkled the cheese. Lots and lots of cheese, white and shredded and everywhere. "
            "Then the toppings. Mushrooms for mama. Olives for papa. "
            "And for Felix, tiny pieces of pineapple, his secret favorite. "
            "Into the oven it went, and they watched through the little window. "
            "The cheese melted and bubbled. The crust turned golden brown. "
            "The whole kitchen smelled incredible, warm and savory and perfect. "
            "When it was done, papa cut it into slices. "
            "Felix took the first piece, pulling it away with a long stretch of cheese. "
            "He bit into it and closed his eyes. "
            "This is the best pizza I've ever had, he said. "
            "And it was, because they made it together."
        ),
    },
    {
        "id": "food-05",
        "title": "The Soup Pot",
        "description": "Stirring a big pot of warm soup on a cold day.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "It was the kind of day where the wind blew cold and the sky was grey. "
            "A soup kind of day, said mama. "
            "She got out the biggest pot in the kitchen, the one with two handles. "
            "Ivy helped wash the vegetables. Carrots, celery, potatoes, and onions. "
            "Mama chopped them into little pieces. Chop, chop, chop went the knife. "
            "Into the pot they went, with a glug of olive oil. "
            "They sizzled and popped, and the kitchen started to smell amazing. "
            "Then mama added water and some special herbs. "
            "Thyme and bay leaves, she said. They're the secret to good soup. "
            "Ivy stood on her step stool and watched the pot. "
            "The water started to bubble, and the vegetables began to soften. "
            "Can I stir? asked Ivy. "
            "Of course, said mama, and handed her the big wooden spoon. "
            "Ivy stirred slowly, around and around. The soup swirled and steamed. "
            "She stirred in big circles, then little ones, making patterns in the pot. "
            "After a long time, the soup was ready. "
            "They poured it into bowls and sat at the table. "
            "The first spoonful warmed Ivy from the inside out. "
            "On cold days, she thought, nothing is better than a pot of warm soup."
        ),
    },
    {
        "id": "food-06",
        "title": "Apple Picking Day",
        "description": "Visiting the orchard and picking apples right from the tree.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "The orchard was full of apple trees, rows and rows stretching up a gentle hill. "
            "The apples were red and green and gold, hanging from the branches like ornaments. "
            "Caleb carried a big cloth bag over his shoulder. "
            "His job was to find the best apples in the whole orchard. "
            "He reached up and twisted a red apple gently. It came off the branch with a satisfying snap. "
            "He held it up to the sunlight. It was perfect, shiny and round with no bruises. "
            "Into the bag it went. "
            "He found a green apple next, tart and firm. And a golden one that smelled like honey. "
            "Some apples were too high to reach, but that was okay. "
            "Caleb's sister lifted him up for one special apple at the very top. "
            "That one's the king of apples, he said. "
            "When the bag was heavy and full, they sat under a tree and ate one right there. "
            "The apple was crisp and sweet, the juice running down Caleb's chin. "
            "It tasted different from store apples. It tasted like sunshine and fresh air. "
            "We'll make apple pie with the rest, said his sister. "
            "Caleb nodded, already looking forward to the warm, cinnamon smell filling the house."
        ),
    },
    {
        "id": "food-07",
        "title": "The Cookie Baker",
        "description": "Baking warm cookies and filling the house with sweetness.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Nana said that the secret to good cookies was love and a little extra butter. "
            "She tied an apron around Violet's waist and gave her a big mixing bowl. "
            "First, the butter and sugar. Cream them together, said nana. "
            "Violet stirred hard. The butter and sugar turned pale and fluffy. "
            "Then an egg, cracked into the middle. Violet stirred it in slowly. "
            "Then vanilla. Just a splash, but it smelled like heaven. "
            "Nana measured the flour and let Violet sift it into the bowl. "
            "A little cloud of flour puffed up and landed on Violet's nose. "
            "They both laughed. "
            "Last came the chocolate chips. Violet poured them in and stirred. "
            "Nana helped her scoop little balls of dough onto the baking tray. "
            "Into the oven they went, and Violet pressed her face against the glass to watch. "
            "The cookies spread out and turned golden, the chocolate chips getting melty. "
            "The whole house filled with the most wonderful smell in the world. "
            "When the timer dinged, nana took them out. "
            "They waited three whole minutes, which felt like forever. "
            "Then Violet took a bite. Warm, soft, gooey, perfect. "
            "These are the best cookies ever, nana. "
            "Nana winked. It's the love. And the extra butter."
        ),
    },
    {
        "id": "food-08",
        "title": "Spaghetti Surprise",
        "description": "A funny and messy spaghetti dinner with the family.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Spaghetti was tricky. It was long and wiggly and refused to stay on the fork. "
            "But Gus loved it anyway. "
            "Tonight, mama made her special spaghetti with tomato sauce and tiny meatballs. "
            "The noodles were long and slippery. The sauce was red and warm. "
            "Gus twirled his fork, trying to wrap the noodles around it. "
            "One noodle slipped off and slapped his chin. He giggled. "
            "He tried again. This time he got a big twirl, but when he lifted the fork, "
            "the whole pile of spaghetti came with it, like a noodle tornado. "
            "Mama laughed. Papa laughed. Gus laughed so hard his belly hurt. "
            "He slurped a noodle and it whipped sauce onto his cheek. "
            "There was sauce on his hands, sauce on his shirt, sauce on his nose. "
            "Papa had a noodle hanging from his fork like a mustache. "
            "That's your spaghetti mustache, said Gus. "
            "They were all laughing and eating and making a beautiful mess together. "
            "After dinner, Gus looked like he had taken a bath in tomato sauce. "
            "But his tummy was full and his heart was happy. "
            "Spaghetti is the funniest food, he said. "
            "And no one disagreed."
        ),
    },
    {
        "id": "food-09",
        "title": "The Smoothie Dance",
        "description": "Making a fruit smoothie and dancing while the blender spins.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "After school, Wren and her brother Miles made smoothies. "
            "It was their special tradition, every Tuesday and Thursday. "
            "Wren got the blender and Miles opened the freezer. "
            "Frozen strawberries. Frozen mango. Frozen banana pieces. "
            "Into the blender they went, all frosty and colorful. "
            "Then a splash of orange juice and a big spoonful of yogurt. "
            "Ready? said Miles, his hand on the blender button. "
            "Wait! said Wren. We forgot the most important part. "
            "She pressed play on the kitchen speaker. Music filled the room. "
            "Now, she said. "
            "Miles pressed the button and the blender whirred to life. "
            "While it blended, they danced. The smoothie dance was different every time. "
            "Today it was the banana boogie, with lots of arm waving and hip shaking. "
            "The blender spun and the fruit turned into a thick, creamy swirl. "
            "Pink and orange and beautiful. "
            "Miles poured the smoothie into two tall glasses. "
            "They put in paper straws and took big sips at the same time. "
            "Cold, sweet, fruity, and just a little tangy from the orange juice. "
            "Best one yet, said Wren. "
            "You say that every time, said Miles. "
            "Because it's true every time."
        ),
    },
    {
        "id": "food-10",
        "title": "Garden Salad",
        "description": "Growing vegetables in the garden and making a fresh salad.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "All spring, Jasmine and her dad had been growing vegetables in the backyard. "
            "They planted tiny seeds in neat little rows and watered them every day. "
            "At first, nothing happened. The soil just sat there, brown and quiet. "
            "But then, one morning, little green sprouts poked up through the dirt. "
            "They're growing! Jasmine squealed. "
            "The sprouts grew into leaves, and the leaves grew bigger every day. "
            "Lettuce, tomatoes, cucumbers, and radishes. "
            "By summer, the garden was bursting with color. "
            "Today, said dad, we're going to eat what we grew. "
            "Jasmine picked the lettuce carefully, leaf by leaf. "
            "She pulled up a radish, red and round, shaking off the dirt. "
            "Dad cut a cucumber from the vine. It was cool and green and perfect. "
            "The tomatoes were small and sweet, warm from the sun. "
            "They washed everything and tore the lettuce into pieces. "
            "Dad made a simple dressing with olive oil and lemon. "
            "They tossed it all together in a big wooden bowl. "
            "Jasmine took a bite. It tasted so fresh, so alive, so real. "
            "We made this, she said, looking at the garden. "
            "We really did, said dad, and they finished every last leaf."
        ),
    },
    {
        "id": "food-11",
        "title": "Hot Chocolate Clouds",
        "description": "Making warm cocoa with fluffy whipped cream on a chilly day.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "It was the kind of cold that makes your cheeks pink and your fingers tingly. "
            "When Poppy came inside, her nose was like a little ice cube. "
            "Mama was already in the kitchen, heating milk on the stove. "
            "Hot chocolate? asked Poppy, pulling off her mittens. "
            "With clouds, said mama, smiling. "
            "Mama stirred cocoa powder and a spoonful of sugar into the warm milk. "
            "Round and round, until it turned a deep, rich brown. "
            "Poppy watched the steam curl up from the pot, twisting and dancing. "
            "Then mama poured it into two big mugs, the ones with the polka dots. "
            "Now for the clouds, said mama. "
            "She shook the whipped cream can and pressed the nozzle. "
            "A big, fluffy mountain of cream piled up on top of the hot chocolate. "
            "It looked exactly like a cloud sitting on a chocolate lake. "
            "Poppy picked up her mug with both hands. It was warm against her cold fingers. "
            "She took a sip. The whipped cream tickled her upper lip. "
            "The hot chocolate was sweet and warm and velvety. "
            "It warmed her throat, then her chest, then her whole body. "
            "This is the best thing about cold days, said Poppy. "
            "Mama clinked her mug against Poppy's. Cheers to the clouds."
        ),
    },
    {
        "id": "food-12",
        "title": "The Lunchbox Adventure",
        "description": "Packing a fun and colorful lunch to take to school.",
        "topics": ["food"],
        "ageMin": 1,
        "ageMax": 6,
        "text": (
            "Every morning, Hugo and his mama packed his lunchbox together. "
            "But it wasn't just any lunchbox. It was an adventure box. "
            "Today, said mama, your lunchbox is going on a trip to the ocean. "
            "Hugo's eyes lit up. "
            "Mama made a sandwich and cut it into the shape of a fish with a cookie cutter. "
            "She used a blueberry for the eye. Hugo laughed. "
            "Then she arranged little carrot sticks to look like a starfish. "
            "A handful of goldfish crackers for the fish's friends. "
            "A small container of blue yogurt for the ocean. "
            "And a clementine, peeled and separated, arranged like a sunshine in the corner. "
            "Hugo looked at his lunchbox. It was a whole underwater world. "
            "This is so cool, he said. I almost don't want to eat it. "
            "Almost, said mama, winking. "
            "At school, Hugo opened his lunchbox and his friends gathered around. "
            "Whoa! they said. That's the coolest lunch ever! "
            "Hugo ate every single bite. The fish sandwich, the starfish carrots, all of it. "
            "When he got home, he gave mama a big hug. "
            "Can tomorrow's lunch go to outer space? he asked. "
            "Mama smiled. I'll see what I can do."
        ),
    },
]


# ---------------------------------------------------------------------------
# ElevenLabs helpers
# ---------------------------------------------------------------------------


def list_voices() -> list[dict]:
    resp = requests.get(
        f"{API_BASE}/voices",
        headers={"xi-api-key": ELEVENLABS_API_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["voices"]


def generate_with_timestamps(
    text: str,
    voice_id: str,
    model_id: str = "eleven_multilingual_v2",
) -> dict:
    """Call ElevenLabs TTS with timestamps. Returns {audio_base64, alignment}."""
    resp = requests.post(
        f"{API_BASE}/text-to-speech/{voice_id}/with-timestamps",
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.75,
                "similarity_boost": 0.75,
                "style": 0.3,
                "use_speaker_boost": True,
            },
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def chars_to_sentence_segments(
    text: str, alignment: dict
) -> list[dict]:
    """Convert character-level timestamps to sentence-level segments."""
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]

    # Split text into sentences at . ! ? boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    segments = []
    char_offset = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Find the character range for this sentence in the alignment
        sent_start = None
        sent_end = None

        # Search for the start of this sentence in the character array
        # Match by advancing through chars to find the sentence boundary
        sent_char_count = len(sentence)
        search_end = min(char_offset + sent_char_count + 10, len(chars))

        for i in range(char_offset, min(search_end, len(starts))):
            if starts[i] > 0 or i == char_offset:
                if sent_start is None:
                    sent_start = starts[i]
            sent_end = ends[i]

        char_offset += sent_char_count
        # Skip whitespace between sentences
        while char_offset < len(chars) and chars[char_offset] in (' ', '\n', '\t'):
            char_offset += 1

        if sent_start is not None and sent_end is not None:
            segments.append({
                "text": sentence,
                "startTime": round(sent_start, 2),
                "endTime": round(sent_end, 2),
            })

    return segments


def estimate_duration_seconds(text: str) -> int:
    """Rough estimate: ~2.5 words per second for calm narration."""
    words = len(text.split())
    return int(words / 2.5)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Generate Mello audio stories via ElevenLabs")
    parser.add_argument("--list-voices", action="store_true", help="List available voices and exit")
    parser.add_argument("--voice-id", default=None, help="ElevenLabs voice ID to use")
    parser.add_argument("--model-id", default="eleven_multilingual_v2", help="ElevenLabs model ID")
    parser.add_argument("--only", default=None, help="Comma-separated story IDs to generate")
    parser.add_argument("--skip-existing", action="store_true", help="Skip stories that already have audio")
    parser.add_argument("--dry-run", action="store_true", help="Write manifest only, no audio generation")
    args = parser.parse_args()

    if args.list_voices:
        voices = list_voices()
        print(f"\n{'Name':<25} {'ID':<30} {'Category':<15}")
        print("-" * 70)
        for v in sorted(voices, key=lambda x: x.get("name", "")):
            print(f"{v['name']:<25} {v['voice_id']:<30} {v.get('category', 'N/A'):<15}")
        return

    # Pick a voice — default to user's preferred voice
    voice_id = args.voice_id
    if not voice_id:
        voice_id = "AXdMgz6evoL7OPd7eU12"
        print(f"Using default voice: {voice_id}")

    # Filter stories if --only is specified
    stories_to_generate = STORIES
    if args.only:
        ids = set(args.only.split(","))
        stories_to_generate = [s for s in STORIES if s["id"] in ids]
        print(f"Generating {len(stories_to_generate)} stories: {[s['id'] for s in stories_to_generate]}")

    # Prepare output dirs
    audio_dir = OUTPUT_DIR / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    # Load existing manifest if present
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest: dict[str, dict] = {}
    if manifest_path.exists():
        with open(manifest_path) as f:
            existing = json.load(f)
            manifest = {s["id"]: s for s in existing.get("stories", [])}

    for i, story in enumerate(stories_to_generate):
        story_id = story["id"]
        audio_file = audio_dir / f"{story_id}.mp3"

        if args.skip_existing and audio_file.exists() and story_id in manifest:
            print(f"[{i+1}/{len(stories_to_generate)}] Skipping {story_id} (already exists)")
            continue

        print(f"[{i+1}/{len(stories_to_generate)}] Generating {story_id}: {story['title']}...")

        if args.dry_run:
            # Estimate duration and create dummy segments
            duration = estimate_duration_seconds(story["text"])
            sentences = re.split(r'(?<=[.!?])\s+', story["text"].strip())
            segments = []
            time_per_sentence = duration / max(len(sentences), 1)
            for j, sent in enumerate(sentences):
                segments.append({
                    "text": sent.strip(),
                    "startTime": round(j * time_per_sentence, 2),
                    "endTime": round((j + 1) * time_per_sentence, 2),
                })
        else:
            try:
                result = generate_with_timestamps(story["text"], voice_id, args.model_id)

                # Save audio
                audio_bytes = base64.b64decode(result["audio_base64"])
                with open(audio_file, "wb") as f:
                    f.write(audio_bytes)

                # Calculate actual duration from audio (rough: file_size / bitrate)
                # More accurate: use alignment end time
                alignment = result["alignment"]
                if alignment["character_end_times_seconds"]:
                    duration = int(max(alignment["character_end_times_seconds"])) + 1
                else:
                    duration = estimate_duration_seconds(story["text"])

                segments = chars_to_sentence_segments(story["text"], alignment)

                print(f"  -> {len(audio_bytes)} bytes, {duration}s, {len(segments)} segments")

            except Exception as e:
                print(f"  ERROR: {e}")
                # Still add to manifest with estimated data so we can retry later
                duration = estimate_duration_seconds(story["text"])
                segments = []

        # Update manifest entry
        manifest[story_id] = {
            "id": story_id,
            "title": story["title"],
            "description": story["description"],
            "topics": story["topics"],
            "ageMin": story["ageMin"],
            "ageMax": story["ageMax"],
            "storyText": story["text"],
            "durationSeconds": duration,
            "segments": segments,
            "audioFile": f"audio/{story_id}.mp3",
        }

        # Rate limiting — be nice to the API
        if not args.dry_run and i < len(stories_to_generate) - 1:
            time.sleep(1)

    # Write manifest
    manifest_data = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "voiceId": voice_id,
        "modelId": args.model_id,
        "stories": list(manifest.values()),
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest_data, f, indent=2)

    print(f"\nDone! Manifest written to {manifest_path}")
    print(f"Audio files: {audio_dir}/")
    print(f"Total stories: {len(manifest)}")


if __name__ == "__main__":
    main()
