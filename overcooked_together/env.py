"""PettingZoo ParallelEnv backed by the exact JavaScript browser simulation.

Observations are fully observable physical state, with no procedural recipe
requirements unless procedure=True. No recipe-dependent action masks are used.
"""
import copy
import json
import os
from pathlib import Path
import shutil
import subprocess
import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv

ACTIONS = ("wait", "up", "right", "down", "left", "interact", "work")
INGREDIENTS = ("fish", "rice", "nori", "beef", "bun", "cheese", "dough", "tomato")
STATIONS = ("counter", "chop", "pot", "pan", "oven", "plates", "sink", "returns", "serve", "trash", "supply", "wall")
RECIPES = ("sushi", "burger", "cheeseburger", "pizza")
STAGES = ("raw", "chopped", "cooked")
DIRECTIONS = ("up", "right", "down", "left")


def _parts(item):
    result = np.zeros(24, dtype=np.float32)
    if item:
        for p in item["parts"]:
            result[INGREDIENTS.index(p["type"]) * 3 + STAGES.index(p["stage"])] += 1
    return result


def encode(obs):
    grid = np.zeros((9, 13, 56), dtype=np.float32)
    for s in obs["stations"]:
        g = grid[s["y"], s["x"]]
        g[STATIONS.index(s["type"])]=1
        if "ingredient" in s:
            g[12 + INGREDIENTS.index(s["ingredient"])]=1
        item = s["item"] or {}
        g[20:44] = _parts(item)
        g[44:48] = [item.get(k, False) for k in ("plate", "dirty", "baked", "burnt")]
        g[48:52] = [s["progress"]/10, s["cook"]/32, s["over"]/91, s["plates"]/4]
    players = np.zeros((2, 35), dtype=np.float32)
    for p in obs["players"]:
        row=players[p["id"]]
        row[:2]=[p["x"]/12, p["y"]/8]
        row[2 + DIRECTIONS.index(p["dir"])]=1
        item = p["held"] or {}
        row[6:11]=[bool(item)] + [item.get(k, False) for k in ("plate", "dirty", "baked", "burnt")]
        row[11:35]=_parts(item)
        grid[p["y"],p["x"],52+p["id"]]=1
        grid[p["y"],p["x"],54+p["id"]]=bool(p["work"])
    orders = np.zeros((3,14), dtype=np.float32)
    for i,o in enumerate(obs["orders"]):
        orders[i, RECIPES.index(o["recipe"])]=1
        for ingredient in o["ingredients"]:
            orders[i,4+INGREDIENTS.index(ingredient)]=1
        orders[i,12:]=[o["remaining"]/600,1]
    procedures=np.zeros((4,26), dtype=np.float32)
    for name,r in obs.get("procedures",{}).items():
        i=RECIPES.index(name)
        for ingredient,stage in r["parts"]:
            procedures[i,3*INGREDIENTS.index(ingredient)+STAGES.index(stage)]=1
        procedures[i,24:]=[r["bake"],1]
    returns=np.zeros((4,),dtype=np.float32)
    for i,r in enumerate(sorted(obs["returnQueue"],key=lambda r:r["at"])):
        returns[i]=(r["at"]-obs["tick"])/18
    motion=obs["motion"]
    meta=np.array([obs["tick"]/obs["horizon"],obs["score"]/(80*obs["horizon"]),obs["playerId"],obs["roleMode"]=="fixed",obs["motionPhase"]/7,(motion["every"]-obs["tick"]%motion["every"])/motion["every"] if motion else 0,obs["done"]],dtype=np.float32)
    return dict(grid=grid,players=players,orders=orders,procedures=procedures,returns=returns,meta=meta)


class OvercookedTogether(ParallelEnv):
    metadata={"name":"overcooked_together_v0", "render_modes":["ansi"], "is_parallelizable":True, "render_fps":5}
    possible_agents=["chef_0","chef_1"]

    def __init__(self, scene="sushi-city", horizon=1500, procedure=False,
                 role_mode=None, swap_seats=False, menu=None, render_mode=None, node=None):
        if render_mode not in (None,"ansi"):
            raise ValueError("Use ansi, or export_episode() and load it in the browser viewer")
        if not isinstance(horizon,int) or horizon<1:
            raise ValueError("horizon must be a positive integer")
        self.render_mode=render_mode
        self.max_cycles=horizon
        self.options=dict(scene=scene,horizon=horizon,procedure=bool(procedure),swapSeats=bool(swap_seats))
        if role_mode is not None:self.options["roleMode"]=role_mode
        if menu is not None:self.options["menu"]=list(menu)
        root=Path(__file__).resolve().parent.parent
        bridge=Path(__file__).resolve().parent/"js"/"bridge.mjs"
        if not bridge.exists():bridge=root/"src"/"bridge.mjs"
        executable=node or os.environ.get("OVERCOOKED_NODE") or shutil.which("node")
        local=root.parent.parent/".tools"/"bin"/"node"
        if not executable and local.exists():executable=str(local)
        if not executable:raise RuntimeError("Node.js >=20 is required; set OVERCOOKED_NODE if it is not on PATH")
        self._process=subprocess.Popen([executable,str(bridge)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
        shapes=dict(grid=(9,13,56),players=(2,35),orders=(3,14),procedures=(4,26),returns=(4,),meta=(7,))
        self.observation_spaces={a:spaces.Dict({k:spaces.Box(0,1,shape=shape,dtype=np.float32) for k,shape in shapes.items()}) for a in self.possible_agents}
        self.action_spaces={a:spaces.Discrete(len(ACTIONS)) for a in self.possible_agents}
        self.state_space=spaces.Box(0,1,shape=(sum(int(np.prod(s)) for s in shapes.values()),),dtype=np.float32)
        self.agents=[]
        self._raw=None
        self._rng=np.random.default_rng()

    def _call(self,op,**kwargs):
        if self._process.poll() is not None:raise RuntimeError("Simulator closed")
        self._process.stdin.write(json.dumps(dict(op=op,**kwargs))+"\n")
        self._process.stdin.flush()
        line=self._process.stdout.readline()
        if not line:raise RuntimeError("Simulator stopped unexpectedly: "+self._process.stderr.read())
        response=json.loads(line)
        if "error" in response:raise ValueError(response["error"])
        return response["result"]

    def observation_space(self,agent):return self.observation_spaces[agent]
    def action_space(self,agent):return self.action_spaces[agent]

    def reset(self,seed=None,options=None):
        # Reserved reset options are accepted for ParallelEnv compatibility.
        # Scenario configuration belongs to the constructor.
        if seed is not None:self._rng=np.random.default_rng(seed)
        episode_seed=int(seed if seed is not None else self._rng.integers(0,2**32))
        settings={**self.options,"horizon":self.max_cycles,"seed":episode_seed}
        result=self._call("reset",options=settings)
        self.agents=self.possible_agents[:]
        for i,a in enumerate(self.agents):self.action_spaces[a].seed(episode_seed+i)
        self._raw=result["observations"]
        return {a:encode(self._raw[i]) for i,a in enumerate(self.agents)},{a:{} for a in self.agents}

    def step(self,actions):
        if not self.agents:
            if actions:raise ValueError("No active agents; reset first")
            return {},{},{},{},{}
        if set(actions)!=set(self.agents):raise ValueError("Provide one primitive action for every live agent")
        if any(not self.action_space(a).contains(v) for a,v in actions.items()):raise ValueError("Action must be an integer in [0, 6]")
        result=self._call("step",actions=[int(actions[a]) for a in self.possible_agents])
        active=self.agents[:];self._raw=result["observations"]
        observations={a:encode(self._raw[i]) for i,a in enumerate(active)}
        rewards={a:float(result["reward"]) for a in active}
        terminations={a:False for a in active}
        truncations={a:bool(result["done"]) for a in active}
        infos={a:{"team_score":self._raw[0]["score"],**result["info"]} for a in active}
        if result["done"]:self.agents=[]
        return observations,rewards,terminations,truncations,infos

    def observe_text(self,agent):
        """Detached semantic observation for an LLM; same information boundary."""
        if self._raw is None:raise RuntimeError("reset first")
        return copy.deepcopy(self._raw[self.possible_agents.index(agent)])

    def state(self):
        """Global physical features for a centralized critic, ego index fixed to 0."""
        if self._raw is None:raise RuntimeError("reset first")
        observation=encode(self._raw[0])
        return np.concatenate([observation[k].ravel() for k in sorted(observation)])

    def scripted_actions(self):
        """Debug expert with recipe knowledge; never an observation field."""
        if not self.agents:raise RuntimeError("reset first")
        return dict(zip(self.possible_agents,self._call("script_actions")))

    def export_episode(self,path=None):
        record=self._call("export")
        if path is not None:Path(path).write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
        return record

    def render(self):
        if self._raw is None:return "Call reset first"
        obs=self._raw[0];tiles=[[" " for _ in range(obs["width"])] for _ in range(obs["height"])]
        glyphs=dict(counter="#",chop="C",pot="P",pan="F",oven="O",plates="D",sink="W",returns="R",serve="S",trash="T",supply="I",wall="X")
        for s in obs["stations"]:tiles[s["y"]][s["x"]]=glyphs[s["type"]]
        for p in obs["players"]:tiles[p["y"]][p["x"]]=str(p["id"])
        return f"tick={obs['tick']} score={obs['score']}\n"+"\n".join("".join(row) for row in tiles)

    def close(self):
        process=getattr(self,"_process",None)
        if process is None:return
        if process.poll() is None:
            process.stdin.close()
            try:process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill();process.wait()
        for stream in (process.stdout,process.stderr):stream.close()

    def __enter__(self):return self
    def __exit__(self,*_):self.close()


def parallel_env(**kwargs):return OvercookedTogether(**kwargs)
