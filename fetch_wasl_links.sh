#!/bin/bash

# Script to fetch WASL video links from signasl.org

words=(
"hello" "hi" "goodbye" "bye" "thanks" "thank" "please" "sorry" "yes" "no"
"help" "need" "want" "like" "love" "good" "bad" "happy" "sad" "angry"
"friend" "family" "mother" "mom" "father" "dad" "brother" "sister" "child" "baby"
"man" "woman" "person" "people" "home" "house" "school" "work"
"eat" "drink" "food" "water" "milk" "coffee" "tea" "breakfast" "lunch" "dinner"
"sleep" "wake" "morning" "afternoon" "evening" "night" "today" "tomorrow" "yesterday"
"now" "later" "time" "day" "week" "month" "year"
"monday" "tuesday" "wednesday" "thursday" "friday" "saturday" "sunday"
"january" "february" "march" "april" "may" "june" "july" "august" "september" "october" "november" "december"
"go" "come" "stop" "wait" "run" "walk" "sit" "stand"
"look" "see" "watch" "hear" "listen" "speak" "talk" "tell" "say" "ask" "answer"
"know" "understand" "learn" "teach" "read" "write" "book" "computer" "phone"
"car" "bus" "train" "airplane" "dog" "cat" "bird" "fish"
"color" "red" "blue" "green" "yellow" "black" "white"
"big" "small" "hot" "cold" "new" "old" "young" "beautiful"
"money" "buy" "sell" "store" "doctor" "hospital" "sick" "medicine" "pain"
"one" "two" "three" "four" "five" "six" "seven" "eight" "nine" "ten"
)

echo "{"

for i in "${!words[@]}"; do
    word="${words[$i]}"
    echo "Fetching: $word" >&2
    
    # Fetch the page and extract mp4 link
    url=$(curl -s "https://www.signasl.org/sign/$word" | grep -o 'https://[^"]*\.mp4' | head -1)
    
    if [ -n "$url" ]; then
        echo "  \"$word\": \"$url\""
        if [ $i -lt $((${#words[@]} - 1)) ]; then
            echo ","
        fi
    else
        echo "  \"$word\": \"NOT_FOUND\""
        if [ $i -lt $((${#words[@]} - 1)) ]; then
            echo ","
        fi
    fi
    
    # Small delay to avoid overwhelming the server
    sleep 0.5
done

echo "}"
