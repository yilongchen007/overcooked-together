"""Single-agent training adapter that only queries a supplied teammate policy."""
import gymnasium as gym
from .env import OvercookedTogether


class WithPartner(gym.Env):
    """Control one seat while an external inference-only callable controls the other.

    partner(observation) -> integer action. The caller freezes model weights.
    This adapter never calls learn(), backward(), or an optimizer. A callable's
    optional reset() clears recurrent episode history, not model parameters.
    """
    metadata=OvercookedTogether.metadata

    def __init__(self,partner,ego="chef_0",**kwargs):
        if ego not in OvercookedTogether.possible_agents:raise ValueError("Invalid ego seat")
        self.env=OvercookedTogether(**kwargs)
        self.partner=partner
        self.ego=ego
        self.other=next(a for a in self.env.possible_agents if a!=ego)
        self.observation_space=self.env.observation_space(ego)
        self.action_space=self.env.action_space(ego)
        self.render_mode=self.env.render_mode
        self._observations=None

    def reset(self,*,seed=None,options=None):
        super().reset(seed=seed)
        if hasattr(self.partner,"reset"):self.partner.reset()
        self._observations,infos=self.env.reset(seed=seed,options=options)
        return self._observations[self.ego],infos[self.ego]

    def step(self,action):
        if not self.env.agents:raise RuntimeError("Call reset before stepping")
        other_action=self.partner(self._observations[self.other])
        self._observations,rewards,terminated,truncated,infos=self.env.step({self.ego:action,self.other:other_action})
        return self._observations[self.ego],rewards[self.ego],terminated[self.ego],truncated[self.ego],infos[self.ego]

    def render(self):return self.env.render()
    def close(self):self.env.close()
