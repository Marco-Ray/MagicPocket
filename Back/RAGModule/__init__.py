from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from utils import *


class Chain4RAG:
    def __init__(self, model):
        self.instruction = """
## System
根据给定的场景（Scenario），为Intent从SentenceList中筛选最多k个最符合的句子，并返回这些句子在SentenceList中的相应索引作为top-k。此外，根据RecordList，挑选出符合Intent的前提下最能提供新信息的k个句子，并返回这些句子在SentenceList中的相应索引作为bottom-k。
# Steps
1. **理解场景和Intent**：仔细阅读给定的场景以理解Intent是什么。
2. **筛选top-k句子**：
   - 分析SentenceList中的每个句子，并评估其与Intent的相关性。
   - 选择最符合Intent的k个句子。
   - 记录这些句子在SentenceList中的索引，将其标识为top-k。
3. **筛选bottom-k句子**：
   - 在SentenceList的基础上，结合RecordList。
   - 评估哪些句子在符合intent的同时，能提供新的信息。
   - 选择最能提供新信息的k个句子。
   - 记录这些句子在SentenceList中的索引，将其标识为bottom-k。

# Output Format
    - 输出格式为JSON，包含两个字段：
    - `top_k`: 一个数组，包含最符合Intent的句子在SentenceList中的索引。
    - `bottom_k`: 一个数组，包含符合Intent且提供新信息的句子在SentenceList中的索引。
    - {format_instructions}

# Notes
- `SentenceList`中的句子应按相关性进行排序以帮助选出top-k。
- 仅当句子与Intent高度相关时才选择，如果没有满足条件的句子则不选择。
- 评选bottom-k时，要考虑recordList中的已有信息，尽量选择新的和有增量信息的句子，如果没有满足条件的句子则不选择。

## User:
    Scenario: {scenario}
    Intent: {intent}
    SentenceList: {sentenceList}
    RecordList: {recordList}
    k: {k}
"""

        self.model = model
        self.parser = JsonOutputParser(pydantic_object=sentenceGroupsIndex)
        self.prompt_template = PromptTemplate(
            input_variables=["scenario", "intentList", "recordList", "sentenceList", "k"],
            template=self.instruction,
            partial_variables={
                "format_instructions": self.parser.get_format_instructions()
            },
        )

        self.chain = self.prompt_template | self.model | self.parser

    async def invoke(self, scenario, intent, sentenceList, recordList, k):
        return self.chain.invoke(
            {"scenario": scenario, "intent": intent, "sentenceList": sentenceList, "recordList": recordList, "k": k}
        )