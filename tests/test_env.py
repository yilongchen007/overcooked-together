import unittest
import numpy as np
from pettingzoo.test import parallel_api_test, parallel_seed_test
from gymnasium.utils.env_checker import check_env
from overcooked_together import parallel_env, WithPartner

class EnvironmentTests(unittest.TestCase):
    def test_parallel_api_all_scenes(self):
        for scene in ('sushi-city','burger-mine','pizza-castle'):
            with parallel_env(scene=scene) as env:
                parallel_api_test(env,num_cycles=75)

    def test_pettingzoo_seed_contract(self):
        parallel_seed_test(lambda:parallel_env(scene='burger-mine',horizon=100),num_cycles=100)

    def test_observations_and_oracle_boundary(self):
        for procedure in (False,True):
            with parallel_env(procedure=procedure) as env:
                obs,_=env.reset(seed=42)
                for a in env.agents:
                    self.assertTrue(env.observation_space(a).contains(obs[a]))
                    self.assertEqual(bool(obs[a]['procedures'].any()),procedure)
                    self.assertEqual('procedures' in env.observe_text(a),procedure)
                self.assertTrue(env.state_space.contains(env.state()))
                text=env.observe_text('chef_0');text['players'][0]['x']=999
                self.assertNotEqual(env.observe_text('chef_0')['players'][0]['x'],999)

    def test_time_limit_is_truncation(self):
        with parallel_env(horizon=2) as env:
            env.reset(seed=1)
            env.step(dict(chef_0=0,chef_1=0))
            obs,rewards,terms,truncs,infos=env.step(dict(chef_0=0,chef_1=0))
            self.assertTrue(all(truncs.values()));self.assertFalse(any(terms.values()))
            self.assertEqual(env.agents,[])
            self.assertEqual(env.step({}),({},{},{},{},{}))
            self.assertEqual(rewards['chef_0'],rewards['chef_1'])

    def test_reject_invalid_joint_actions_without_advancing(self):
        with parallel_env() as env:
            env.reset(seed=1)
            for actions in ({'chef_0':0},{'chef_0':99,'chef_1':0},{'chef_0':'cook','chef_1':0}):
                with self.assertRaises(ValueError):env.step(actions)
            self.assertEqual(env.observe_text('chef_0')['tick'],0)

    def test_scripted_end_to_end_reward_and_records(self):
        for scene in ('sushi-city','burger-mine','pizza-castle'):
            with parallel_env(scene=scene,horizon=700) as env:
                env.reset(seed=42);total=0
                while env.agents:
                    obs,rewards,terms,truncs,infos=env.step(env.scripted_actions())
                    for a in obs:self.assertTrue(env.observation_space(a).contains(obs[a]))
                    total+=rewards['chef_0']
                    self.assertEqual(rewards['chef_0'],rewards['chef_1'])
                record=env.export_episode()
                self.assertGreater(record['final']['delivered'],0)
                self.assertEqual(total,record['final']['score'])
                self.assertEqual(len(record['trace']),700)
                self.assertEqual(record['roleMode'],'fixed' if scene=='burger-mine' else 'flexible')

    def test_fixed_partner_gym_wrapper(self):
        env=WithPartner(lambda obs:0,horizon=10)
        try:
            check_env(env,skip_render_check=True)
            obs,_=env.reset(seed=3)
            self.assertTrue(env.observation_space.contains(obs))
        finally:env.close()

    def test_process_closes(self):
        env=parallel_env();env.reset(seed=1);process=env._process;env.close()
        self.assertIsNotNone(process.poll())

if __name__=='__main__':unittest.main()
