import json

def load_knowledge():

    with open("data/interior_knowledge.json","r") as file:
        return json.load(file)