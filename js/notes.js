"use strict";
/* ==================================================================
   DROP THE BEAN - love notes: one short note for each chapter.

   HOW TO WRITE YOUR OWN NOTE (for the owner):
   - Each line below is one chapter's note. The first line is chapter 1, the next is chapter 2,
     and so on, up to chapter 80. The number at the end of each line says which chapter it is.
   - To change a note, change only the words between the two double quotes " ".
     Keep the quotes and the comma at the end of the line.
   - If your words need a double quote inside them, type \" instead (or just use ' ).
   - Keep it short: about two lines on a phone (up to about 140 letters) reads best.
   - She sees a note the first time she finishes that chapter's last level,
     and can read it again any time in the Album tab, under Chapters.
   Example:
       "You are my favorite person in the whole world. Love, me.",   // 1
=================================================================== */

const NOTES = [
  "Every cat is tucked in. Thank you for being so kind to them, and to me.",                       // 1
  "You make hard things look easy. These cats are lucky to have you.",                              // 2
  "A little reminder: you are loved, today and every day.",                                         // 3
  "Under every blanket there is a happy cat. Under every day with you there is a happy me.",        // 4
  "Gates open, cats asleep. Now it is your turn to rest a little.",                                 // 5
  "A full house is a happy house. Ours is my favorite one.",                                        // 6
  "You found the way through. You always do.",                                                      // 7
  "We make a good team, you and me. Like Bean and Meowsy.",                                         // 8
  "The night train is quiet now. Sweet dreams when it is time.",                                    // 9
  "Ten chapters done! I am proud of you, a little more every day.",                                 // 10
  "Safe and sound. That is how I feel with you.",                                                   // 11
  "Even the sleepiest cat would wake up to say hi to you.",                                         // 12
  "Pajamas on, snacks ready, best company: you.",                                                   // 13
  "If you are hungry, the snacks are on me. Always.",                                               // 14
  "Rest well. You give so much, you deserve a soft pillow.",                                        // 15
  "So many tracks, and you found the right one. Like you found me.",                                // 16
  "My heart has no lock and no key. It is just yours.",                                             // 17
  "Every pillow fort needs a queen. Guess who.",                                                    // 18
  "The moon is pretty tonight. Not as pretty as you, but close.",                                   // 19
  "Sweet dreams, my favorite. Twenty chapters of happy cats!",                                      // 20
  "Even sleepwalkers find their way home. Mine always leads to you.",                               // 21
  "You climbed the whole cat tower. Time for a well earned nap.",                                   // 22
  "Moonlight, a warm blanket, and you. That is a perfect night.",                                   // 23
  "The cats are dizzy with joy. So am I, when you smile.",                                          // 24
  "Somewhere a cat is sitting by the window, waiting for you. So am I.",                            // 25
  "Purr purr. That is cat for: you are wonderful.",                                                 // 26
  "There are a lot of stars tonight. I would still pick you.",                                      // 27
  "Cats have nine lives. I would spend every one of mine with you.",                                // 28
  "You make every corner of my day a cozy one.",                                                    // 29
  "Take a deep breath. You are doing great, and I am right here.",                                  // 30
  "A quiet moment, a happy cat, a warm heart. Thank you for all three.",                            // 31
  "Thirty two chapters! You are the best cat sitter in town.",                                      // 32
  "If you ever feel tired, remember: naps are allowed. Hugs too.",                                  // 33
  "The cats voted. You are their favorite human. I agree.",                                         // 34
  "Little by little, level by level. That is how we build good things.",                            // 35
  "Every bed is full, every cat is warm. My heart too.",                                            // 36
  "You are the sunbeam every cat looks for.",                                                       // 37
  "Thank you for the small things you do that no one sees. I see them.",                            // 38
  "This chapter is done. Go get some tea. You earned it.",                                          // 39
  "Forty chapters together. Here is to forty more.",                                                // 40
  "When you laugh, even the cats look up.",                                                         // 41
  "Soft paws, soft hearts. You have the softest one I know.",                                       // 42
  "You are my home, wherever we are.",                                                              // 43
  "Some cats like boxes. I like you. A lot.",                                                       // 44
  "On slippery days, hold my hand. I will hold yours.",                                             // 45
  "You never give up. That is one of my favorite things about you.",                                // 46
  "Every cat in this chapter says thank you. So do I.",                                             // 47
  "A warm lap, a slow blink, a happy sigh. That is love, cat style.",                               // 48
  "I hope today was gentle with you. If not, tomorrow will try harder.",                            // 49
  "Fifty chapters! You and these cats have come so far.",                                           // 50
  "You make ordinary days feel like little holidays.",                                              // 51
  "The cats are snoring. Now you can rest too.",                                                    // 52
  "Press pause, look up, and know that someone loves you very much.",                               // 53
  "Even the doors open for you. Smart and kind, what a mix.",                                       // 54
  "You are the best part of my every day.",                                                         // 55
  "Here is a slow blink from me to you. It means I love you.",                                      // 56
  "If I were a cat, I would nap next to you all day.",                                              // 57
  "Thank you for being patient. With puzzles, with cats, and with me.",                             // 58
  "One more chapter, one more reason to be proud of you.",                                          // 59
  "Sixty chapters. You make it look like a walk in the garden.",                                    // 60
  "Every tunnel leads somewhere. Mine always lead back to you.",                                    // 61
  "You have a gift for making things fit. Like how we fit.",                                        // 62
  "The cats have found their beds. I found my person.",                                             // 63
  "Rainy day or sunny day, I am glad it is a day with you.",                                        // 64
  "You are stronger than you think, and sweeter than you know.",                                    // 65
  "Little paws say thank you for every cozy bed you made.",                                         // 66
  "When things feel big, we can take them one small step at a time.",                               // 67
  "Sixty eight chapters of happy cats. You did that.",                                              // 68
  "The world turns, and I still pick you every time.",                                              // 69
  "A cat in the sun, a cup of coffee, and you. My favorite morning.",                               // 70
  "Thank you for making our home such a warm place.",                                               // 71
  "Some days are puzzles. I am glad I get to solve them with you.",                                 // 72
  "If you are reading this, give yourself a little hug from me.",                                   // 73
  "You turned every corner just right. You always know the way.",                                   // 74
  "The cats will dream of you tonight. Happy dreams only.",                                         // 75
  "Seventy six chapters! I never doubted you for a second.",                                        // 76
  "Sweet dreams are made of quiet nights, warm blankets, and you.",                                 // 77
  "Almost at the end. I hope every page made you smile.",                                           // 78
  "You took care of every cat, one by one. You take care of me too.",                               // 79
  "Two thousand levels. Every one of them a little love letter to you. Thank you for playing.",     // 80
];
