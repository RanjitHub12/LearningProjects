// Monaco language ids keyed by our internal language name.
export const LANG = { cpp: 'cpp', python: 'python', java: 'java' };

// Order the Save-to-Vault pipeline animates through.
export const STEP_ORDER = ['analyze', 'dedup', 'save'];

// Language boilerplates seeded into a fresh editor.
export const BOILER = {
  cpp:
`#include <iostream>
using namespace std;

int main() {
    // Your solution here
    return 0;
}`,
  python:
`def solve():
    # Your solution here
    pass

solve()`,
  java:
`public class Solution {
    public static void main(String[] args) {
        // Your solution here
    }
}`,
};
