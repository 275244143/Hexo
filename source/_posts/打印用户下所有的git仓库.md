---
title: 打印用户下所有的git仓库
author: 神秘人
tags:
  - shell
  - git
categories:
  - Linux
mathjax: false
date: 2019-11-20 09:41:18
---

```shell

$ curl -s https://api.github.com/users/nonsequitur/repos?per_page=1000 |grep git_url |awk '{print $2}'| sed 's/"\(.*\)",/\1/'                                                                                        
git://github.com/nonsequitur/bitcoinbook.git                                                               
git://github.com/nonsequitur/bundix.git                                                                    
git://github.com/nonsequitur/cask.git                                                                      
git://github.com/nonsequitur/dotfiles.git                                                                  
git://github.com/nonsequitur/elementsproject.github.io.git                                                 
git://github.com/nonsequitur/emacs-git-gutter.git                                                          
git://github.com/nonsequitur/emacs-git-gutter-fringe.git                                                   
git://github.com/nonsequitur/events.git                                                                    
git://github.com/nonsequitur/flickr-download.git                                                           
git://github.com/nonsequitur/fringe-helper.el.git                                                          
git://github.com/nonsequitur/GamePlay.git                                                                  
git://github.com/nonsequitur/git-gutter-fringe-plus.git                                                    
git://github.com/nonsequitur/git-gutter-plus.git                                                           
git://github.com/nonsequitur/git-modes.git                                                                 
git://github.com/nonsequitur/helm-helm-commands.git                                                        
git://github.com/nonsequitur/home-manager.git                                                              
git://github.com/nonsequitur/idle-highlight-mode.git                                                       
git://github.com/nonsequitur/inf-ruby.git                                                                  
git://github.com/nonsequitur/kdlearn.git                                                                   
git://github.com/nonsequitur/magit.git                                                                     
git://github.com/nonsequitur/melpa.git                                                                     
git://github.com/nonsequitur/nix-emacs.git                                                                 
git://github.com/nonsequitur/nixpkgs.git                                                                   
git://github.com/nonsequitur/nox.git                                                                       
git://github.com/nonsequitur/ofborg.git                                                                    
git://github.com/nonsequitur/orglink.git                                                                   
git://github.com/nonsequitur/overlay-bug-emacs.d.git                                                       
git://github.com/nonsequitur/projectile.git                                                                
git://github.com/nonsequitur/python-mnemonic.git                                                           
git://github.com/nonsequitur/qt3d.git                                                                      
git://github.com/nonsequitur/rubygems.git                                                                  
git://github.com/nonsequitur/rum.git                                                                       
git://github.com/nonsequitur/rum-dev.git                                                                   
git://github.com/nonsequitur/s.el.git                                                                      
git://github.com/nonsequitur/show-performance-bug.git                                                      
git://github.com/nonsequitur/smex.git                                                                      
git://github.com/nonsequitur/test.git                                                                      
git://github.com/nonsequitur/tldr.git                                                                      
git://github.com/nonsequitur/tldr.el.git                                                                   
git://github.com/nonsequitur/victor-arias-event-sim.git                                                    
git://github.com/nonsequitur/vimeo-download.git                                 ```                           

```